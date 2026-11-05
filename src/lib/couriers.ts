// Couriers the owner ships with. Trackon's page accepts the ID from a form, so it can open with the
// result. India Post's page needs a captcha, so customers copy the ID and paste it there.

export const COURIERS = {
  trackon: { label: "Trackon", trackUrl: "https://www.trackon.in/courier-tracking", formField: "awbSingleTrackingId" },
  india_post: { label: "India Post", trackUrl: "https://www.indiapost.gov.in/", formField: null },
} as const;

export type CourierKey = keyof typeof COURIERS;
export const isCourier = (value: unknown): value is CourierKey => typeof value === "string" && Object.hasOwn(COURIERS, value);
export const normalizeTrackingId = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, "").toUpperCase() : "");
export const isTrackingId = (value: string) => /^[A-Z0-9-]{6,30}$/.test(value);
