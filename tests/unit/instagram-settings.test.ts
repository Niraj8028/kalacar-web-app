import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/catalogue-db", () => ({ addressDb: vi.fn() }));
const { parseInstagram } = await import("@/lib/instagram");

describe("Instagram setting", () => {
  it("keeps only the username from whatever the owner pastes", () => {
    for (const username of ["kalacar.in", "@kalacar.in", "https://www.instagram.com/kalacar.in/", "https://instagram.com/kalacar.in?igsh=abc"]) {
      expect(parseInstagram({ show: true, username })).toEqual({ value: { show: true, username: "kalacar.in" } });
    }
  });
  it("refuses anything that isn't a username", () => {
    for (const username of ["javascript:alert(1)", "a b", "https://evil.example/x", "<script>"]) {
      expect(parseInstagram({ show: false, username })).toHaveProperty("error");
    }
  });
  it("won't show without a username", () => {
    expect(parseInstagram({ show: true, username: "" })).toHaveProperty("error");
    expect(parseInstagram({ show: false, username: "" })).toEqual({ value: { show: false, username: "" } });
  });
});
