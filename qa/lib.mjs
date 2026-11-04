// Shared helpers for Kalacar's local regression suites (development database only).
// Every suite creates its own "QA Fixture" products/accounts and removes them afterwards,
// so the owner's real catalogue, customers and orders are never touched.
import mysql from "mysql2/promise";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import zlib from "node:zlib";

export const SHOP = "http://localhost:3000";
export const DASHBOARD = "http://localhost:5173";
export const ORIGIN = { Origin: SHOP };
export const OUT = fileURLToPath(new URL("./output/", import.meta.url));
mkdirSync(OUT, { recursive: true });

if (process.env.DB_NAME !== "u480209824_temp_db") throw new Error("QA suites only run against the development database (check .env.local).");
export const pool = mysql.createPool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectionLimit: 8, enableKeepAlive: true });
export const q = async (sql, args = []) => (await pool.query(sql, args))[0];

let passed = 0, failed = 0;
export const ok = (name, condition, detail = "") => { condition ? passed++ : failed++; console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? "  " + detail : ""}`); };
export const results = () => ({ passed, failed });

const cleanups = [];
export const onCleanup = (fn) => cleanups.push(fn);
export async function finish() {
  for (const fn of cleanups.reverse()) { try { await fn(); } catch (error) { console.log("cleanup error:", error.message); } }
  await pool.end();
  console.log(`${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

/** Signed-in session for an existing user id; removed at cleanup. */
export async function session(userId) {
  const token = randomBytes(32).toString("base64url"), hash = createHash("sha256").update(token).digest("hex");
  await q("INSERT INTO kalacar_sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))", [hash, userId]);
  onCleanup(() => q("DELETE FROM kalacar_sessions WHERE token_hash=?", [hash]));
  return { token, cookie: `kalacar_customer_session=${token}` };
}
/** Temporary customer (deleted at cleanup, with their addresses and sessions). */
export async function customer(label = "shopper", phone = "9000000000") {
  const id = randomUUID(), email = `qa-${label}-${id.slice(0, 6)}@example.invalid`;
  await q("INSERT INTO kalacar_users (id,name,email,phone,password_hash) VALUES (?,?,?,?,?)", [id, `QA ${label}`, email, phone, "x"]);
  onCleanup(async () => {
    const orders = await q("SELECT id FROM kalacar_orders WHERE user_id=?", [id]);
    for (const o of orders) { await q("DELETE FROM kalacar_order_items WHERE order_id=?", [o.id]); await q("DELETE FROM kalacar_orders WHERE id=?", [o.id]); }
    await q("DELETE FROM kalacar_users WHERE id=?", [id]);
  });
  return { id, email, ...(await session(id)) };
}
/** Session for the real owner account (only a session is created; the account isn't changed). */
export async function owner() {
  const emails = (process.env.KALACAR_OWNER_EMAILS ?? "").split(",").map(e => e.trim()).filter(Boolean);
  const [row] = await q("SELECT id FROM kalacar_users WHERE email IN (?) LIMIT 1", [emails.length ? emails : ["-"]]);
  if (!row) throw new Error("Sign in once as the owner (Google) so the owner account exists.");
  return session(row.id);
}

/** A small solid-colour PNG in public/uploads, removed at cleanup. */
export function photo(rgb = [176, 141, 87]) {
  const w = 96, h = 96, raw = Buffer.concat(Array.from({ length: h }, () => Buffer.from([0, ...Array.from({ length: w }, () => rgb).flat()])));
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(t), d])) >>> 0); return Buffer.concat([len, Buffer.from(t), d, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
  const name = `qa-fixture-${randomBytes(4).toString("hex")}.png`, path = fileURLToPath(new URL(`../public/uploads/${name}`, import.meta.url));
  mkdirSync(fileURLToPath(new URL("../public/uploads/", import.meta.url)), { recursive: true });
  writeFileSync(path, png); onCleanup(() => { if (existsSync(path)) unlinkSync(path); });
  return { url: `/uploads/${name}`, path };
}

/**
 * Creates a QA fixture product with colours directly in the database (deleted at cleanup).
 * colours: [{ name, swatch?, price, originalPrice?, stock, active? }]
 */
export async function fixtureProduct({ name, deity = "QA", colours = [{ name: "Standard", price: 600, stock: 50 }] } = {}) {
  const suffix = randomBytes(3).toString("hex");
  const id = `qa-fixture-${suffix}`, title = name ?? `QA Fixture ${suffix}`;
  const made = colours.map((c, i) => ({ id: `${id}-${i}`, swatch: c.swatch ?? "#b08d57", originalPrice: c.originalPrice ?? c.price, active: c.active ?? true, gallery: [photo().url], ...c }));
  const first = made.find(c => c.active) ?? made[0];
  await q("INSERT INTO kalacar_products (id,name,deity,image,gallery,image_alt,placement,accordions,price,original_price,stock) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    [id, title, deity, first.gallery[0], JSON.stringify(first.gallery), `${title} product photo`, "", "[]", Math.min(...made.filter(c => c.active).map(c => c.price)), first.originalPrice, made.filter(c => c.active).reduce((s, c) => s + c.stock, 0)]);
  for (const [i, c] of made.entries()) await q("INSERT INTO kalacar_product_variants (id,product_id,name,swatch,gallery,price,original_price,stock,sort,active) VALUES (?,?,?,?,?,?,?,?,?,?)", [c.id, id, c.name, c.swatch, JSON.stringify(c.gallery), c.price, c.originalPrice, c.stock, i, c.active ? 1 : 0]);
  onCleanup(async () => {
    const items = await q("SELECT DISTINCT order_id FROM kalacar_order_items WHERE product_id=?", [id]);
    for (const it of items) { await q("DELETE FROM kalacar_order_items WHERE order_id=?", [it.order_id]); await q("DELETE FROM kalacar_orders WHERE id=?", [it.order_id]); }
    await q("DELETE FROM kalacar_products WHERE id=?", [id]);
  });
  return { id, name: title, colours: made };
}
export const colourStock = async (variantId) => Number((await q("SELECT stock FROM kalacar_product_variants WHERE id=?", [variantId]))[0]?.stock);
export const productStock = async (productId) => Number((await q("SELECT stock FROM kalacar_products WHERE id=?", [productId]))[0]?.stock);

/** agent-browser helpers bound to a session name (closed at cleanup). */
export function browser(name) {
  const ab = (...args) => { try { return execFileSync("agent-browser", ["--session", name, ...args], { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"] }); } catch (error) { return String(error.stdout || "") + String(error.stderr || ""); } };
  const js = (code) => { const raw = ab("eval", code).trim(); try { const v = JSON.parse(raw); return typeof v === "string" ? v : JSON.stringify(v); } catch { return raw; } };
  onCleanup(() => ab("close"));
  return { ab, js,
    signIn: (origin, cookieToken) => { ab("open", origin + "/"); ab("cookies", "set", "kalacar_customer_session", cookieToken, "--url", origin, "--http-only"); },
    go: (url) => { ab("open", url); ab("wait", "--load", "networkidle"); ab("wait", "1200"); },
    shot: (file) => ab("screenshot", OUT + file),
    setValue: (selector, value) => js(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'missing'; const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(String(value))}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return 'ok'; })()`),
    noSidewaysScroll: () => js("String(document.documentElement.scrollWidth <= document.documentElement.clientWidth)") === "true",
  };
}
