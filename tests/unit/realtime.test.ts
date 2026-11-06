import { beforeEach, describe, expect, it, vi } from "vitest";
import { OWNER_CHANNEL, customerChannel, customerMayJoin, ownerMayJoin } from "@/lib/realtime-channels";

describe("who may join a channel", () => {
  it("lets the owner join only the owner channel", () => {
    expect(ownerMayJoin(OWNER_CHANNEL)).toBe(true);
    expect(ownerMayJoin(customerChannel("a"))).toBe(false);
  });
  it("lets a customer join only their own channel", () => {
    expect(customerMayJoin(customerChannel("a"), "a")).toBe(true);
    expect(customerMayJoin(customerChannel("b"), "a")).toBe(false);
    expect(customerMayJoin(OWNER_CHANNEL, "a")).toBe(false);
    expect(customerMayJoin("shop", "a")).toBe(false);
  });
});

describe("a failing or missing Pusher can't harm a save", () => {
  const trigger = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    trigger.mockReset();
    for (const name of ["PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET", "PUSHER_CLUSTER"]) vi.stubEnv(name, "x");
    vi.doMock("pusher", () => ({ default: class { trigger = trigger; authorizeChannel() { return {}; } } }));
    vi.doMock("@/lib/catalogue-db", () => ({ addressDb: vi.fn(), listProducts: vi.fn() }));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  const saved = async () => new Response("saved", { status: 200 });

  it("signals after a successful save", async () => {
    trigger.mockResolvedValue({ status: 200 });
    const { signalled } = await import("@/lib/realtime");
    expect((await signalled(["products"], saved)()).status).toBe(200);
    expect(trigger).toHaveBeenCalledWith(["shop", OWNER_CHANNEL], "products", {});
  });
  it("sends no signal after a refused save", async () => {
    const { signalled } = await import("@/lib/realtime");
    await signalled(["products"], async () => new Response("no", { status: 400 }))();
    expect(trigger).not.toHaveBeenCalled();
  });
  it("still answers when Pusher rejects", async () => {
    trigger.mockRejectedValue({ status: 500 });
    const { signalled } = await import("@/lib/realtime");
    expect((await signalled(["products"], saved)()).status).toBe(200);
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  it("still answers when sending throws straight away", async () => {
    trigger.mockImplementation(() => { throw new Error("bad"); });
    const { signalled } = await import("@/lib/realtime");
    expect((await signalled(["products"], saved)()).status).toBe(200);
  });
  it("doesn't wait for a slow Pusher", async () => {
    trigger.mockReturnValue(new Promise(() => undefined));
    const { signalled } = await import("@/lib/realtime");
    expect((await signalled(["coupons"], saved)()).status).toBe(200);
  });
  it("turns off quietly with no keys", async () => {
    vi.stubEnv("PUSHER_SECRET", "");
    const { realtimeConfig, signalled } = await import("@/lib/realtime");
    expect(realtimeConfig()).toEqual({ key: null, cluster: null });
    expect((await signalled(["products"], saved)()).status).toBe(200);
    expect(trigger).not.toHaveBeenCalled();
  });
  it("gives browsers the public key, never the secret", async () => {
    vi.stubEnv("PUSHER_SECRET", "SECRETVALUE");
    const { realtimeConfig } = await import("@/lib/realtime");
    expect(JSON.stringify(realtimeConfig())).not.toContain("SECRETVALUE");
  });
});

describe("shared product list", () => {
  beforeEach(() => { vi.resetModules(); delete (globalThis as { kalacarShopProducts?: unknown }).kalacarShopProducts; });
  async function load(listProducts: ReturnType<typeof vi.fn>) {
    vi.doMock("@/lib/catalogue-db", () => ({ listProducts }));
    return import("@/lib/shop-products");
  }
  it("shares one database read between visitors", async () => {
    const list = vi.fn().mockResolvedValue([{ id: "a" }]);
    const { listShopProducts } = await load(list);
    await Promise.all([listShopProducts(), listShopProducts(), listShopProducts()]);
    await listShopProducts();
    expect(list).toHaveBeenCalledTimes(1);
  });
  it("reads again after a change", async () => {
    const list = vi.fn().mockResolvedValue([]);
    const { forgetShopProducts, listShopProducts } = await load(list);
    await listShopProducts();
    forgetShopProducts();
    await listShopProducts();
    expect(list).toHaveBeenCalledTimes(2);
  });
  it("doesn't keep a read that a change overtook", async () => {
    let finish: (value: unknown[]) => void = () => undefined;
    const list = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue([{ id: "new" }]);
    const { forgetShopProducts, listShopProducts } = await load(list);
    const old = listShopProducts();
    forgetShopProducts();
    finish([{ id: "old" }]);
    await old;
    expect(await listShopProducts()).toEqual([{ id: "new" }]);
  });
  it("doesn't keep a failed read", async () => {
    const list = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue([{ id: "a" }]);
    const { listShopProducts } = await load(list);
    await expect(listShopProducts()).rejects.toThrow("down");
    expect(await listShopProducts()).toEqual([{ id: "a" }]);
  });
});
