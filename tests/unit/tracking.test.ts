import { describe, expect, it } from "vitest";
import { parseTracking } from "@/lib/tracking";

const PIXEL_CODE = `<script>!function(f,b,e,v,n,t,s){}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '4436512496660507');
fbq('track', 'PageView');</script>`;
const GTM_CODE = `<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-KZJ27PVT"></script>`;

describe("ad and analytics tag settings", () => {
  it("takes plain IDs", () => expect(parseTracking({ metaPixelId: "4436512496660507", googleTagIds: ["GTM-KZJ27PVT", "G-Q8Y0NWXH2Z"] })).toEqual({ value: { metaPixelId: "4436512496660507", googleTagIds: ["GTM-KZJ27PVT", "G-Q8Y0NWXH2Z"] } }));
  it("picks the IDs out of pasted install code", () => expect(parseTracking({ metaPixelId: PIXEL_CODE, googleTagIds: `${GTM_CODE}\n${GTM_CODE.replace("KZJ27PVT", "PMJWSM6Z")}` })).toEqual({ value: { metaPixelId: "4436512496660507", googleTagIds: ["GTM-KZJ27PVT", "GTM-PMJWSM6Z"] } }));
  it("drops repeats and fixes lowercase", () => expect(parseTracking({ googleTagIds: "gtm-kzj27pvt, GTM-KZJ27PVT" })).toEqual({ value: { metaPixelId: "", googleTagIds: ["GTM-KZJ27PVT"] } }));
  it("allows turning everything off", () => expect(parseTracking({ metaPixelId: "", googleTagIds: [] })).toEqual({ value: { metaPixelId: "", googleTagIds: [] } }));
  it("refuses anything that isn't an ID", () => {
    expect(parseTracking({ metaPixelId: "abc" })).toHaveProperty("error");
    expect(parseTracking({ googleTagIds: "hello world" })).toHaveProperty("error");
    expect(parseTracking({ googleTagIds: "G-1 G-2 G-3 G-4 G-5 G-6".replace(/G-(\d)/g, "G-ABCD$1") })).toHaveProperty("error");
  });
  it("never keeps script text, only IDs", () => {
    const parsed = parseTracking({ metaPixelId: "4436512496660507", googleTagIds: `<script>alert(1)</script> GTM-KZJ27PVT` });
    expect(JSON.stringify(parsed)).not.toMatch(/script|alert/);
  });
});
