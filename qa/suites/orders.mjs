// Owner order lifecycle: cancel unpaid, refund paid, tracking note, no "mark paid".
import { q, ok, finish, customer, owner, fixtureProduct, colourStock, SHOP, ORIGIN } from "../lib.mjs";
import { randomUUID } from "node:crypto";
try {
  const product = await fixtureProduct({ colours: [{ name: "Standard", price: 600, stock: 50 }] }); const colour = product.colours[0];
  const buyer = await customer("buyer"), own = await owner();
  const makeOrder = async (status, fulfillment, qty) => {
    const id = randomUUID();
    await q("INSERT INTO kalacar_orders (id,user_id,idempotency_key,razorpay_order_id,amount,status,fulfillment_status,customer_name,email,phone,address,pincode) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", [id, buyer.id, randomUUID(), "order_QA" + id.slice(0, 8), 600 * qty, status, fulfillment, "QA buyer", buyer.email, "9000000000", "QA address", "411001"]);
    await q("INSERT INTO kalacar_order_items (order_id,product_id,product_name,variant_id,variant_name,unit_price,quantity) VALUES (?,?,?,?,?,?,?)", [id, product.id, product.name, colour.id, colour.name, 600, qty]);
    await q("UPDATE kalacar_product_variants SET stock=stock-? WHERE id=?", [qty, colour.id]);
    return id;
  };
  const patch = async (id, body, cookie = own.cookie) => { const r = await fetch(`${SHOP}/api/admin/orders/${id}`, { method: "PATCH", headers: { ...ORIGIN, Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(body) }); return [r.status, await r.json()]; };
  const row = async (id) => (await q("SELECT status, stock_restored, refund_amount, tracking_note FROM kalacar_orders WHERE id=?", [id]))[0];
  const start = await colourStock(colour.id);
  const pending = await makeOrder("payment_pending", "unfulfilled", 2);
  ok("non-owner cannot cancel", (await patch(pending, { action: "cancel" }, buyer.cookie))[0] === 403);
  ok("cancel unpaid order", (await patch(pending, { action: "cancel", reason: "Customer asked" }))[0] === 200);
  ok("cancel returns stock to the colour", await colourStock(colour.id) === start);
  ok("cancelled and flagged", (await row(pending)).status === "cancelled" && (await row(pending)).stock_restored === 1);
  ok("cancel twice refused, no double restock", (await patch(pending, { action: "cancel" }))[0] === 409 && await colourStock(colour.id) === start);
  ok("customer cannot retry a cancelled order", (await fetch(`${SHOP}/api/account/orders/${pending}/retry`, { headers: { Cookie: buyer.cookie } })).status === 409);
  const paid = await makeOrder("paid", "processing", 3); const afterPaid = await colourStock(colour.id);
  ok("a paid order can't be cancelled", (await patch(paid, { action: "cancel" }))[0] === 409);
  ok("tracking note on a paid order", (await patch(paid, { action: "tracking", note: "India Post EE123456789IN" }))[0] === 200 && (await row(paid)).tracking_note === "India Post EE123456789IN");
  ok("no tracking note on a cancelled order", (await patch(pending, { action: "tracking", note: "x" }))[0] === 409);
  const mine = await (await fetch(`${SHOP}/api/account/orders`, { headers: { Cookie: buyer.cookie } })).json();
  ok("customer sees the tracking note", mine.orders?.find(o => o.id === paid)?.trackingNote === "India Post EE123456789IN");
  ok("refund needs a reason", (await patch(paid, { action: "refund", amount: 100, reason: "" }))[0] === 400);
  ok("refund above total refused", (await patch(paid, { action: "refund", amount: 99999, reason: "x" }))[0] === 400);
  ok("refund on unpaid refused", (await patch(pending, { action: "refund", amount: 1, reason: "x" }))[0] === 409);
  ok("refund with restock", (await patch(paid, { action: "refund", amount: 1800, reason: "Damaged", reference: "rfnd_QA", restock: true }))[0] === 200 && await colourStock(colour.id) === afterPaid + 3);
  ok("refunded with amount", (await row(paid)).status === "refunded" && (await row(paid)).refund_amount === 1800);
  ok("refund twice refused", (await patch(paid, { action: "refund", amount: 1, reason: "x" }))[0] === 409);
  const sync = await (await fetch(`${SHOP}/api/account/orders/${paid}/sync`, { method: "POST", headers: { ...ORIGIN, Cookie: buyer.cookie } })).json();
  ok("payment re-check leaves refunded alone", sync.status === "refunded" && (await row(paid)).status === "refunded");
  const shipped = await makeOrder("paid", "dispatched", 1); const s2 = await colourStock(colour.id);
  ok("no automatic restock after dispatch", (await patch(shipped, { action: "refund", amount: 600, reason: "Returned", restock: true }))[0] === 409);
  ok("partial refund without restock", (await patch(shipped, { action: "refund", amount: 300, reason: "Chipped base" }))[0] === 200 && await colourStock(colour.id) === s2);
  ok("no way to mark an order paid", (await patch(pending, { action: "paid" }))[0] === 400 && (await row(pending)).status === "cancelled");
  const detail = await (await fetch(`${SHOP}/api/admin/orders/${paid}`, { headers: { Cookie: own.cookie } })).json();
  ok("dashboard order shows refund and colour", detail.order?.refundAmount === 1800 && detail.order?.items?.[0]?.variant === colour.name);
} finally { await finish(); }
