/**
 * India-first formatting helpers.
 *
 * Every rupee amount, phone number and date rendered anywhere on the site goes
 * through one of these, so the whole surface stays consistent:
 *   - ₹ with Indian digit grouping (₹24,000 / ₹1,20,000)
 *   - +91 XXXXX XXXXX phone formatting
 *   - DD/MM/YYYY dates
 */

const INR_WHOLE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const INR_PAISE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a rupee amount in major units.
 *
 * Whole rupees render without decimals (₹2,500) — the design never shows
 * ".00". Fractional amounts keep two decimals so GST splits stay honest.
 */
export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return Number.isInteger(amount)
    ? INR_WHOLE.format(amount)
    : INR_PAISE.format(amount);
}

/** Format an amount held in paise (Razorpay's minor units). */
export function formatPaise(paise: number): string {
  return formatINR(paise / 100);
}

/** Rupees → paise, for handing an amount to Razorpay. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Display an Indian mobile number as `+91 98110 24680`.
 *
 * Accepts anything the MGD API or a form might hand over: bare 10 digits, a
 * `+91` or `91` prefix, a leading zero, or spaces. Anything that is not a
 * recognisable 10-digit Indian number is returned trimmed but unchanged rather
 * than mangled.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  if (local.length !== 10) return raw.trim();
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

/** Strip a phone number to the E.164 form MGD de-duplicates on. */
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return local.length === 10 ? `+91${local}` : raw.trim();
}

/** A 10-digit Indian mobile, in any of the usual written forms. */
export function isValidIndianMobile(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(local);
}

export function isValidEmail(raw: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw.trim());
}

/**
 * DD/MM/YYYY. Formats in IST regardless of where the server runs — MyGymDesk
 * exposes no timezone on the timetable, so the whole site is hard-coded to the
 * gyms' local time (see PRD §7).
 */
export function formatDate(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: IST,
  }).format(d);
}

/** DD/MM — the short form the timetable day tabs use. */
export function formatDayMonth(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone: IST,
  }).format(d);
}

export const IST = "Asia/Kolkata";

/** `Asia/Kolkata` "today", as a Date pinned to midnight IST. */
export function todayIST(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: IST,
  }).format(now);
  return new Date(`${parts}T00:00:00+05:30`);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** `0` Sunday … `6` Saturday, matching the MGD `dayOfWeek` contract. */
export const DAY_LABELS_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export const DAY_LABELS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** "07:00" → "07:00". Guards against `7:0` style values from the API. */
export function formatTime(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{1,2})/.exec(hhmm ?? "");
  if (!m) return hhmm ?? "";
  return `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}`;
}

/** Minutes → "60 min", the label used on class cards and timetable rows. */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";
  return `${minutes} min`;
}

/** Zero-padded ordinal used by the policy section numbering (01, 02, …). */
export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
