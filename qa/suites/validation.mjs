// Input validation: oversized auth input, fake images, ₹0 price, request size limits.
import { crash, q, ok, finish, owner, fixtureProduct, colourStock, SHOP, ORIGIN, onCleanup } from "../lib.mjs";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
try {
  const product = await fixtureProduct({ colours: [{ name: "Standard", price: 2000, stock: 12 }] }); const v = product.colours[0];
  const own = await owner(); const OH = { ...ORIGIN, Cookie: own.cookie };
  const ip = `10.250.${Math.floor(Math.random() * 250)}.1`;
  const uploads = () => readdirSync(fileURLToPath(new URL("../../public/uploads/", import.meta.url))).length;
  let t0 = Date.now(), r = await fetch(`${SHOP}/api/auth/login`, { method: "POST", headers: { ...ORIGIN, "Content-Type": "application/json", "X-Forwarded-For": ip }, body: JSON.stringify({ email: "qa@example.invalid", password: "x".repeat(50000) }) });
  ok("50k-character password refused quickly", r.status === 401 && Date.now() - t0 < 1500, `${Date.now() - t0}ms`);
  r = await fetch(`${SHOP}/api/auth/register`, { method: "POST", headers: { ...ORIGIN, "Content-Type": "application/json", "X-Forwarded-For": ip }, body: JSON.stringify({ name: "QA", email: "a".repeat(200) + "@example.invalid", phone: "9000000000", password: "longenough123" }) });
  ok("overlong email refused", r.status === 400);
  r = await fetch(`${SHOP}/api/admin/products/${product.id}/variants/${v.id}`, { method: "PATCH", headers: { ...OH, "Content-Type": "application/json" }, body: JSON.stringify({ price: 0 }) });
  ok("price ₹0 refused, price unchanged", r.status === 400 && Number((await q("SELECT price FROM kalacar_product_variants WHERE id=?", [v.id]))[0].price) === 2000);
  const files0 = uploads();
  const f = new FormData(); f.set("name", "QA Fake Image Murti"); f.set("deity", "QA"); f.set("accordions", "[]");
  f.set("colours", JSON.stringify([{ name: "Standard", swatch: "#b08d57", price: 100, originalPrice: 100, stock: 1, active: true, gallery: [{ kind: "upload", uploadIndex: 0 }] }]));
  f.append("images", new Blob(["<html><script>alert(1)</script></html>"], { type: "image/png" }), "evil.png");
  r = await fetch(`${SHOP}/api/admin/products`, { method: "POST", headers: OH, body: f });
  ok("fake PNG refused, nothing written, no product", r.status === 400 && uploads() === files0 && (await q("SELECT COUNT(*) n FROM kalacar_products WHERE name='QA Fake Image Murti'"))[0].n == 0);
  onCleanup(() => q("DELETE FROM kalacar_products WHERE name='QA Fake Image Murti'"));
  r = await fetch(`${SHOP}/api/account/addresses`, { method: "POST", headers: { ...ORIGIN, "Content-Type": "application/json" }, body: JSON.stringify({ address: "x".repeat(200000) }) });
  ok("200 KB JSON body refused (413)", r.status === 413);
  r = await fetch(`${SHOP}/api/webhooks/razorpay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(200000) });
  ok("oversized webhook body refused (413)", r.status === 413);
  for (const [label, headers] of [["no Origin", {}], ["foreign Origin", { Origin: "https://evil.example" }]]) ok(`write with ${label} blocked`, (await fetch(`${SHOP}/api/auth/logout`, { method: "POST", headers })).status === 403);
  ok("same-origin write allowed", (await fetch(`${SHOP}/api/auth/logout`, { method: "POST", headers: ORIGIN })).status === 200);
  ok("colour stock unchanged by these tests", await colourStock(v.id) === 12);
} catch (error) { crash(error); } finally { await finish(); }
