/**
 * Telling "we couldn't reach the server" apart from "those credentials are wrong".
 *
 * The sign-in form deliberately gives one neutral message for every credential
 * failure, so an attacker cannot use it to discover which addresses exist. That
 * is right for a REJECTION. It is actively harmful for a TRANSPORT failure: a
 * blocked origin or a dropped connection then reads as "your password is
 * wrong", and someone spends an afternoon resetting a password that was fine.
 *
 * That is not hypothetical — it happened. The admin panel was opened on a
 * second domain that the database proxy did not allow-list, every sign-in was
 * refused at the CORS preflight, and the screen blamed the credentials.
 *
 * Supabase surfaces these as `AuthRetryableFetchError`, and a request that
 * never completed has no HTTP status to report.
 */
export function isTransportFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; status?: number; message?: string };

  if (e.name === "AuthRetryableFetchError") return true;
  // A rejected preflight or a dead connection yields status 0 / undefined,
  // where any real answer from the auth server carries a 4xx or 5xx.
  if (e.status === 0 || e.status === undefined) {
    return /fetch|network|failed to fetch|load failed/i.test(e.message ?? "");
  }
  return false;
}

/**
 * Names the problem without pretending to know whose it is. Deliberately not
 * "check your connection" — the usual cause is configuration at our end, and
 * telling a customer to check their wifi for our misconfiguration is rude.
 */
export const TRANSPORT_MESSAGE =
  "We couldn't reach the sign-in service. This is a problem at our end, not with your details — please try again shortly.";
