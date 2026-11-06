import { describe, expect, it } from "vitest";
import { allowedOrigin } from "@/lib/public-origin";

const headers = (host: string, extra: Record<string, string> = {}) => new Headers({ host, ...extra });

describe("site addresses allowed for sign-in", () => {
  it("allows the real domain, www and the dashboard address", () => {
    for (const host of ["kalacar.in", "www.kalacar.in", "admin.kalacar.in"]) expect(allowedOrigin(headers(host))).toBe(`https://${host}`);
  });
  it("still allows the test and local addresses", () => {
    expect(allowedOrigin(headers("firebrick-squid-218523.hostingersite.com"))).toContain("firebrick");
    expect(allowedOrigin(headers("localhost:3000"))).toBe("http://localhost:3000");
  });
  it("refuses anything else, including look-alikes", () => {
    for (const host of ["evil.com", "kalacar.in.evil.com", "shop.kalacar.in", "kalacar.org"]) expect(allowedOrigin(headers(host))).toBeNull();
  });
  it("ignores a faked dashboard header", () => {
    expect(allowedOrigin(headers("evil.com", { "x-kalacar-dashboard-host": "evil.com" }))).toBeNull();
  });
});
