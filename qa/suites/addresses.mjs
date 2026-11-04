// Saved addresses: validation, default handling, 10-address limit, other users blocked.
import { q, ok, finish, customer, SHOP, ORIGIN } from "../lib.mjs";
import { randomUUID } from "node:crypto";
try {
  const a = await customer("addr-a"), b = await customer("addr-b");
  const api = async (u, path, method = "GET", body) => { const r = await fetch(SHOP + path, { method, headers: { ...ORIGIN, Cookie: u?.cookie ?? "", "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json().catch(() => null) }; };
  const addr = (n) => ({ label: "Home", fullName: "QA Person", phone: "98765 4321" + (n % 10), address: `Flat ${n}, Test Building, MG Road`, city: "Pune", state: "Maharashtra", pincode: "411001" });
  ok("signed out → 401", (await api(null, "/api/account/addresses")).status === 401);
  ok("empty list", (await api(a, "/api/account/addresses")).data.addresses.length === 0);
  ok("bad PIN refused", (await api(a, "/api/account/addresses", "POST", { ...addr(0), pincode: "012345" })).status === 400);
  ok("bad phone refused", (await api(a, "/api/account/addresses", "POST", { ...addr(0), phone: "123" })).status === 400);
  const first = (await api(a, "/api/account/addresses", "POST", addr(1))).data.address; ok("first address is default", first.isDefault === true);
  const second = (await api(a, "/api/account/addresses", "POST", { ...addr(2), label: "Work" })).data.address; ok("second is not default", second.isDefault === false && second.label === "Work");
  ok("set default", (await api(a, "/api/account/addresses/" + second.id, "PATCH", { setDefault: true })).data.address.isDefault);
  const list = (await api(a, "/api/account/addresses")).data.addresses; ok("one default, listed first", list.filter(x => x.isDefault).length === 1 && list[0].id === second.id);
  ok("edit address", (await api(a, "/api/account/addresses/" + first.id, "PATCH", { ...addr(1), city: "Nashik" })).data.address.city === "Nashik");
  ok("other user can't read", (await api(b, "/api/account/addresses")).data.addresses.length === 0);
  ok("other user can't edit", (await api(b, "/api/account/addresses/" + first.id, "PATCH", addr(9))).status === 404);
  ok("other user can't delete", (await api(b, "/api/account/addresses/" + first.id, "DELETE")).status === 404);
  ok("delete default", (await api(a, "/api/account/addresses/" + second.id, "DELETE")).status === 200);
  const rest = (await api(a, "/api/account/addresses")).data.addresses; ok("remaining address becomes default", rest.length === 1 && rest[0].isDefault);
  for (let i = 0; i < 9; i++) await api(a, "/api/account/addresses", "POST", addr(i + 3));
  ok("11th address refused (limit 10)", (await api(a, "/api/account/addresses", "POST", addr(99))).status === 409);
  ok("checkout rejects bad phone before reserving", (await api(a, "/api/checkout/orders", "POST", { idempotencyKey: randomUUID(), items: [{ id: "qa-none", quantity: 1 }], customer: { ...addr(1), phone: "12" } })).status === 400);
} finally { await finish(); }
