import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/catalogue-db", () => ({ addressDb: vi.fn() }));
const { parseBrand } = await import("@/lib/brand");

describe("Logo setting", () => {
  it("keeps a photo stored by this site, its width and the white choice", () => {
    expect(parseBrand({ logo: "/uploads/site-1.png", width: 220, white: true })).toEqual({ logo: "/uploads/site-1.png", width: 220, white: true });
  });
  it("older saves with only a logo get the default size and own colours", () => {
    expect(parseBrand({ logo: "/uploads/site-1.png" })).toEqual({ logo: "/uploads/site-1.png", width: 0, white: false });
  });
  it("refuses outside or unsafe logo addresses", () => {
    for (const logo of ["https://evil.com/a.png", "/uploads/../x.png", "javascript:alert(1)", "//evil.com/a.png", 5]) expect(parseBrand({ logo }).logo).toBe("");
  });
  it("width outside 60-320 or not a whole number uses the default", () => {
    for (const width of [59, 321, -5, 150.5, "200", null]) expect(parseBrand({ logo: "", width }).width).toBe(0);
    for (const width of [60, 320]) expect(parseBrand({ width }).width).toBe(width);
  });
  it("only true turns white on", () => {
    for (const white of ["true", 1, null]) expect(parseBrand({ white }).white).toBe(false);
  });
  it("garbage input gives the built-in logo", () => {
    for (const input of [null, undefined, "x", 42, []]) expect(parseBrand(input)).toEqual({ logo: "", width: 0, white: false });
  });
});
