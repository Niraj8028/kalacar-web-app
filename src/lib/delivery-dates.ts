// Delivery dates from the owner's delivery time ("3–7 business days"), in India time.

/** "3–7 business days" → {min 3, max 7}; null when the wording has no day range. */
export function transitDays(estimate: string) {
  const match = /(\d{1,2})\s*(?:[–-]|to)\s*(\d{1,2})/.exec(estimate) ?? /(\d{1,2})()/.exec(estimate);
  if (!match) return null;
  const min = Number(match[1]), max = Number(match[2] || match[1]);
  return min <= max ? { min, max } : null;
}

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

/** Adds business days, skipping Sundays. `day` is a UTC-midnight date standing for an India calendar day. */
function addBusinessDays(day: Date, count: number) {
  const next = new Date(day);
  let left = count;
  while (left > 0) {
    next.setTime(next.getTime() + DAY_MS);
    if (next.getUTCDay() !== 0) left -= 1;
  }
  return next;
}

/**
 * The first and last delivery day for an order placed `now`. After the cut-off hour (India time),
 * or on a Sunday, the count starts from the next working day.
 */
export function deliveryWindow(estimate: string, now: Date, cutoffHour: number) {
  const days = transitDays(estimate);
  if (!days) return null;
  const india = new Date(now.getTime() + IST_OFFSET_MS);
  let start = new Date(Date.UTC(india.getUTCFullYear(), india.getUTCMonth(), india.getUTCDate()));
  if (india.getUTCHours() >= cutoffHour || start.getUTCDay() === 0) start = addBusinessDays(start, 1);
  return { from: addBusinessDays(start, days.min), to: addBusinessDays(start, days.max) };
}

/** "Tue, 2 Dec" */
export const shortDate = (date: Date) => date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
