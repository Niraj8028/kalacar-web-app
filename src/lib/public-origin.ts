// Which Kalacar website a request really belongs to, once hosting proxies are in between.
// Each origin here also needs "<origin>/api/auth/google/callback" as an Authorized redirect URI
// in Google Cloud Console. Add the real domains here when they are connected.
const ALLOWED_ORIGINS = [
  "http://localhost:3000", // shop, local
  "http://localhost:5173", // dashboard, local
  "https://firebrick-squid-218523.hostingersite.com", // shop, hosted
  "https://sienna-herring-231344.hostingersite.com", // dashboard, hosted
];

/** The dashboard's small server sets this, because the shop's own host replaces X-Forwarded-Host. */
const DASHBOARD_HOST_HEADER = "x-kalacar-dashboard-host";

const toOrigin = (host: string) => `${/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https"}://${host}`;

/** Host the browser is on. The dashboard header only counts when it names an allowed address. */
export function publicHost(headers: Headers) {
  const dashboard = headers.get(DASHBOARD_HOST_HEADER);
  if (dashboard && ALLOWED_ORIGINS.includes(toOrigin(dashboard))) return dashboard;
  return headers.get("x-forwarded-host")?.split(",")[0].trim() ?? headers.get("host") ?? "";
}

/** Origin the browser is on, or null if it isn't one of Kalacar's own addresses. */
export function allowedOrigin(headers: Headers) {
  const origin = toOrigin(publicHost(headers));
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}
