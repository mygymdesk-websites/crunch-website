import {
  MgdError,
  MgdNotConfiguredError,
  type MgdErrorCode,
} from "./errors";

/**
 * Low-level transport for the MyGymDesk Website API.
 *
 * Everything about this client is shaped by three facts in the API doc:
 *
 *   1. The API key grants WRITE access to the gym's CRM and booking system.
 *      It lives in an env var, goes out in `x-mgd-api-key` (never `?key=`,
 *      which lands in logs and Referer headers), and never reaches the
 *      browser. Callers are server components and route handlers only.
 *
 *   2. ALL endpoints share ONE hourly budget per key — 30/hour by default,
 *      raised to 300/hour for Crunch at Phase 0. That budget is per key, not
 *      per visitor, so display reads are cached server-side for 15 minutes and
 *      public traffic never touches the limit.
 *
 *   3. Responses carry `Cache-Control: no-store`, so the caching is entirely
 *      on us — hence the explicit `next.revalidate` on every read.
 *
 * `fetchImpl` is injectable so the whole surface is unit-testable without a
 * network.
 */

export const DEFAULT_BASE_URL = "https://db.mygymdesk.in/functions/v1";

/** 15 minutes. Display data changes a few times a week; this is generous. */
export const DISPLAY_REVALIDATE_SECONDS = 900;

export type FetchLike = typeof fetch;

export interface MgdClientOptions {
  baseUrl?: string;
  apiKey?: string;
  fetchImpl?: FetchLike;
  /** Per-request timeout. The API is usually sub-second. */
  timeoutMs?: number;
}

export interface MgdRequestOptions {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /**
   * Seconds to cache the response for. Omit (or pass `false`) for anything
   * that must be fresh — mutations, and any session `id` that is about to be
   * handed to a booking call.
   */
  revalidate?: number | false;
  /** Cache tags, so a webhook or admin action can invalidate a read. */
  tags?: string[];
  signal?: AbortSignal;
}

interface MgdErrorBody {
  error?: string;
  message?: string;
}

export class MgdClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: MgdClientOptions = {}) {
    this.baseUrl = (
      options.baseUrl ??
      process.env.MGD_API_BASE ??
      DEFAULT_BASE_URL
    ).replace(/\/+$/, "");
    this.apiKey = options.apiKey ?? process.env.MGD_API_KEY ?? "";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  /** False until the key is provisioned (Phase 0 client dependency). */
  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async request<T>(endpoint: string, options: MgdRequestOptions = {}): Promise<T> {
    if (!this.isConfigured) throw new MgdNotConfiguredError(endpoint);

    const url = this.buildUrl(endpoint, options.query);
    const method = options.method ?? "GET";

    const headers: Record<string, string> = {
      // Header, never the `?key=` query param.
      "x-mgd-api-key": this.apiKey,
      accept: "application/json",
    };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
    }

    const timeout = AbortSignal.timeout(this.timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout;

    const init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } =
      {
        method,
        headers,
        signal,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      };

    if (typeof options.revalidate === "number") {
      init.next = { revalidate: options.revalidate, tags: options.tags };
    } else {
      // Mutations and pre-booking reads must never be served from a cache.
      init.cache = "no-store";
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, init);
    } catch (cause) {
      throw new MgdError({
        status: 0,
        code: "network_error",
        endpoint,
        message:
          cause instanceof Error && cause.name === "TimeoutError"
            ? `MyGymDesk did not respond within ${this.timeoutMs}ms`
            : `Could not reach MyGymDesk: ${(cause as Error)?.message ?? cause}`,
        body: cause,
      });
    }

    const payload = await readJson(response);

    if (!response.ok) {
      const body = (payload ?? {}) as MgdErrorBody;
      throw new MgdError({
        status: response.status,
        // Branch on `error`; fall back to the status when the endpoint words
        // things its own way (capture-website-lead does).
        code: (body.error ?? statusToCode(response.status)) as MgdErrorCode,
        endpoint,
        message: body.message ?? body.error ?? `HTTP ${response.status}`,
        body: payload,
      });
    }

    return payload as T;
  }

  private buildUrl(
    endpoint: string,
    query?: MgdRequestOptions["query"],
  ): string {
    const url = new URL(`${this.baseUrl}/${endpoint.replace(/^\/+/, "")}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

/** Fallback mapping for endpoints that don't return an `error` field. */
function statusToCode(status: number): MgdErrorCode {
  switch (status) {
    case 401:
      return "unauthorized";
    case 403:
      return "key_inactive";
    case 405:
      return "method_not_allowed";
    case 429:
      return "rate_limit_exceeded";
    default:
      return "internal_error";
  }
}
