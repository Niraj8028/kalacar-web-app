// Dashboard stock edits vs checkouts: expected-value check under the same row locks.
import { q, pool, ok, finish, owner, fixtureProduct, colourStock, SHOP, ORIGIN } from "../lib.mjs";
try {
  const product = await fixtureProduct({ colours: [{ name: "Standard", price: 899, stock: 60 }] }); const v = product.colours[0];
  const own = await owner(); const H = { ...ORIGIN, Cookie: own.cookie, "Content-Type": "application/json" };
  const save = async (body) => { const r = await fetch(`${SHOP}/api/admin/products/${product.id}/variants/${v.id}`, { method: "PATCH", headers: H, body: JSON.stringify(body) }); return [r.status, await r.json()]; };
  const sell = async () => { const c = await pool.getConnection(); try { await c.beginTransaction(); await c.query("SELECT id FROM kalacar_products WHERE id=? FOR UPDATE", [product.id]); const [[row]] = await c.query("SELECT stock FROM kalacar_product_variants WHERE id=? FOR UPDATE", [v.id]); if (row.stock < 1) { await c.rollback(); return 0; } const [r] = await c.query("UPDATE kalacar_product_variants SET stock=stock-1 WHERE id=? AND stock>=1", [v.id]); await c.commit(); return r.affectedRows; } catch (e) { await c.rollback(); throw e; } finally { c.release(); } };
  let s0 = await colourStock(v.id);
  ok("save with current expected stock", (await save({ stock: s0 + 5, expectedStock: s0 }))[0] === 200 && await colourStock(v.id) === s0 + 5);
  const seen = s0 + 5; await sell(); await sell();
  const [st, body] = await save({ stock: seen + 10, expectedStock: seen });
  ok("stale save refused with current stock", st === 409 && body.current.stock === seen - 2);
  ok("the two sales are not lost", await colourStock(v.id) === seen - 2);
  ok("save again with fresh value", (await save({ stock: seen + 8, expectedStock: seen - 2 }))[0] === 200);
  ok("stale price refused", (await save({ price: 900, expectedPrice: 1 }))[0] === 409);
  const base = await colourStock(v.id);
  const all = await Promise.all(Array.from({ length: 10 }, (_, i) => save({ stock: 100 + i, expectedStock: base })));
  ok("10 parallel saves: exactly one wins", all.filter(([c]) => c === 200).length === 1, all.map(([c]) => c).join(","));
  let bad = 0;
  for (let round = 0; round < 8; round++) {
    await q("UPDATE kalacar_product_variants SET stock=20 WHERE id=?", [v.id]);
    const [sold, [code]] = await Promise.all([Promise.all(Array.from({ length: 4 }, sell)).then(a => a.reduce((x, y) => x + y, 0)), save({ stock: 50, expectedStock: 20 })]);
    const final = await colourStock(v.id);
    if (!((code === 200 && final === 50 - sold) || (code === 409 && final === 20 - sold))) bad++;
  }
  ok("8 rounds of 4 checkouts racing a save: no lost sales", bad === 0);
} finally { await finish(); }
