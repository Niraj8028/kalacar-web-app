// Copies existing photos from public/uploads into the database, once, so hosted sites can show them.
// Only photos a product uses are copied; ones already there are left alone.
// Run from kalacar-app: node --env-file=.env.local scripts/copy-photos-to-db.mjs
import { readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const TYPES = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif" };
const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
await db.execute(`CREATE TABLE IF NOT EXISTS kalacar_photos (
  file_name VARCHAR(190) PRIMARY KEY, content_type VARCHAR(40) NOT NULL, bytes MEDIUMBLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

const [products] = await db.query("SELECT image, gallery FROM kalacar_products");
const [variants] = await db.query("SELECT gallery FROM kalacar_product_variants");
const text = JSON.stringify([products, variants]);
const names = [...new Set([...text.matchAll(/\/uploads\/([a-z0-9.-]+)/gi)].map(match => match[1]))];

let copied = 0; const missing = [];
for (const name of names) {
  const bytes = await readFile(path.join("public", "uploads", name)).catch(() => null);
  if (!bytes) { missing.push(name); continue; }
  const [result] = await db.execute("INSERT IGNORE INTO kalacar_photos (file_name,content_type,bytes) VALUES (?,?,?)", [name, TYPES[path.extname(name).toLowerCase()], bytes]);
  copied += result.affectedRows;
}
console.log(`Photos used by products: ${names.length}. Copied now: ${copied}. Missing on this computer: ${missing.length}.`);
if (missing.length) console.log(missing.join("\n"));
await db.end();
