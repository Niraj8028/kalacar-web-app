import mysql, { type RowDataPacket } from "mysql2/promise";
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const allowedDatabase = "u480209824_temp_db";
const allowedUser = "u480209824_shreyasdamase";
let pool: mysql.Pool | undefined;
let ready: Promise<void> | undefined;

function database() {
  const databaseName = process.env.DB_NAME;
  const user = process.env.DB_USER;
  if (databaseName !== allowedDatabase || user !== allowedUser) {
    throw new Error("Kalacar inventory database configuration is missing or outside the approved temporary database.");
  }
  if (!process.env.DB_HOST || !process.env.DB_PASSWORD) throw new Error("Database connection settings are incomplete.");
  return pool ??= mysql.createPool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 3306), user,
    password: process.env.DB_PASSWORD, database: databaseName,
    waitForConnections: true, connectionLimit: 4, queueLimit: 0, charset: "utf8mb4",
  });
}

const seed = [
  ["ganpati", "Ganpati Murti", "Ganpati", "/images/catalogue/ganpati/ganpati-01.jpeg", "Seated Ganpati murti against a soft green background", "For a car dashboard or Devghar", 599, 799, 8],
  ["sri-krishna", "Sri Krishna Murti", "Sri Krishna", "/images/catalogue/sri-krishna/sri-krishna-07.webp", "Small Sri Krishna murti displayed on a car dashboard", "For a car dashboard or Devghar", 699, 899, 5],
  ["swami-samarth", "Swami Samarth Murti", "Swami Samarth", "/images/catalogue/swami-samarth/swami-samarth-01.jpeg", "Seated Swami Samarth murti on a neutral background", "For a car dashboard or Devghar", 749, 999, 0],
] as const;

async function initialize() {
  const db = database();
  await db.execute(`CREATE TABLE IF NOT EXISTS kalacar_products (
    id VARCHAR(64) PRIMARY KEY, name VARCHAR(160) NOT NULL, deity VARCHAR(80) NOT NULL,
    image VARCHAR(500) NOT NULL, gallery TEXT NULL, image_alt VARCHAR(255) NOT NULL, placement VARCHAR(255) NOT NULL,
    price INT UNSIGNED NOT NULL, original_price INT UNSIGNED NOT NULL, stock INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [galleryColumns] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM kalacar_products LIKE 'gallery'");
  if (galleryColumns.length === 0) await db.execute("ALTER TABLE kalacar_products ADD COLUMN gallery TEXT NULL AFTER image");
  await db.query("INSERT IGNORE INTO kalacar_products (id,name,deity,image,image_alt,placement,price,original_price,stock) VALUES ?", [seed]);
  const seedGalleries = [
    ["ganpati", ["/images/catalogue/ganpati/ganpati-01.jpeg", "/images/catalogue/ganpati/ganpati-04.jpeg", "/images/catalogue/ganpati/ganpati-07.jpeg"]],
    ["sri-krishna", ["/images/catalogue/sri-krishna/sri-krishna-07.webp", "/images/catalogue/sri-krishna/sri-krishna-08.webp", "/images/catalogue/sri-krishna/sri-krishna-09.webp"]],
    ["swami-samarth", ["/images/catalogue/swami-samarth/swami-samarth-01.jpeg", "/images/catalogue/swami-samarth/swami-samarth-02.jpeg", "/images/catalogue/swami-samarth/swami-samarth-03.jpeg"]],
  ] as const;
  for (const [id, gallery] of seedGalleries) await db.execute("UPDATE kalacar_products SET gallery=COALESCE(gallery, ?) WHERE id=?", [JSON.stringify(gallery), id]);
  await db.execute(`CREATE TABLE IF NOT EXISTS kalacar_orders (
    id CHAR(36) PRIMARY KEY, idempotency_key CHAR(36) NOT NULL UNIQUE, razorpay_order_id VARCHAR(64) NULL UNIQUE,
    razorpay_payment_id VARCHAR(64) NULL UNIQUE, amount INT UNSIGNED NOT NULL, currency CHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL, customer_name VARCHAR(160) NOT NULL, email VARCHAR(190) NOT NULL,
    phone VARCHAR(32) NOT NULL, address TEXT NOT NULL, pincode VARCHAR(12) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [fulfillmentColumns] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM kalacar_orders LIKE 'fulfillment_status'");
  if (!fulfillmentColumns.length) await db.execute("ALTER TABLE kalacar_orders ADD COLUMN fulfillment_status VARCHAR(24) NOT NULL DEFAULT 'unfulfilled' AFTER status");
  await db.execute(`CREATE TABLE IF NOT EXISTS kalacar_order_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, order_id CHAR(36) NOT NULL,
    product_id VARCHAR(64) NOT NULL, product_name VARCHAR(160) NOT NULL,
    unit_price INT UNSIGNED NOT NULL, quantity INT UNSIGNED NOT NULL,
    KEY order_items_order_id (order_id),
    CONSTRAINT kalacar_order_items_order_fk FOREIGN KEY (order_id) REFERENCES kalacar_orders(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await db.execute(`CREATE TABLE IF NOT EXISTS kalacar_users (
    id CHAR(36) PRIMARY KEY, name VARCHAR(160) NOT NULL, email VARCHAR(190) NOT NULL UNIQUE,
    phone VARCHAR(32) NOT NULL DEFAULT '', password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await db.execute(`CREATE TABLE IF NOT EXISTS kalacar_sessions (
    token_hash CHAR(64) PRIMARY KEY, user_id CHAR(36) NOT NULL, expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY sessions_user_id (user_id),
    CONSTRAINT kalacar_sessions_user_fk FOREIGN KEY (user_id) REFERENCES kalacar_users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await db.execute(`CREATE TABLE IF NOT EXISTS kalacar_webhook_events (
    event_id VARCHAR(100) PRIMARY KEY, event_type VARCHAR(80) NOT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [userColumns] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM kalacar_orders LIKE 'user_id'");
  if (!userColumns.length) await db.execute("ALTER TABLE kalacar_orders ADD COLUMN user_id CHAR(36) NULL AFTER id, ADD KEY orders_user_id (user_id)");
  if (process.env.NODE_ENV === "development" && process.env.KALACAR_DEMO_PASSWORD) {
    const salt = randomBytes(16);
    const hash = await scrypt(process.env.KALACAR_DEMO_PASSWORD, salt, 64) as Buffer;
    const passwordHash = `${salt.toString("hex")}:${hash.toString("hex")}`;
    const demos = [
      [randomUUID(), "Ganpati Demo", "ganpati@example.test", "+919000000001", passwordHash],
      [randomUUID(), "Krishna Demo", "krishna@example.test", "+919000000002", passwordHash],
      [randomUUID(), "Swami Demo", "swami@example.test", "+919000000003", passwordHash],
    ];
    await db.query("INSERT IGNORE INTO kalacar_users (id,name,email,phone,password_hash) VALUES ?", [demos]);
  }
}

export async function ensureCatalogue() {
  ready ??= initialize();
  try { await ready; } catch (error) { ready = undefined; throw error; }
}

type ProductRow = RowDataPacket & { id: string; name: string; deity: string; image: string; gallery: string | null; image_alt: string; placement: string; price: number; original_price: number; stock: number; updated_at: Date };

export async function listProducts() {
  await ensureCatalogue();
  const [rows] = await database().query<ProductRow[]>("SELECT id,name,deity,image,gallery,image_alt,placement,price,original_price,stock,updated_at FROM kalacar_products ORDER BY CASE id WHEN 'ganpati' THEN 0 WHEN 'sri-krishna' THEN 1 WHEN 'swami-samarth' THEN 2 ELSE 3 END, id");
  return rows.map(row => {
    let gallery = [row.image];
    if (row.gallery) { try { gallery = JSON.parse(row.gallery) as string[]; } catch { gallery = [row.image]; } }
    return { id: row.id, name: row.name, deity: row.deity, image: row.image, gallery, imageAlt: row.image_alt, placement: row.placement, price: Number(row.price), originalPrice: Number(row.original_price), stock: Number(row.stock), updatedAt: row.updated_at };
  });
}

export async function createProduct(product: { id: string; name: string; deity: string; image: string; gallery: string[]; price: number; originalPrice: number; stock: number }) {
  await ensureCatalogue();
  await database().execute(
    "INSERT INTO kalacar_products (id,name,deity,image,gallery,image_alt,placement,price,original_price,stock) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [product.id, product.name, product.deity, product.image, JSON.stringify(product.gallery), `${product.name} small devotional murti`, "For a car dashboard or Devghar", product.price, product.originalPrice, product.stock],
  );
}

type CheckoutLine = { id: string; quantity: number };
type CheckoutCustomer = { name: string; email: string; phone: string; address: string; pincode: string };
type OrderRow = RowDataPacket & { id: string; user_id: string | null; idempotency_key: string; razorpay_order_id: string | null; razorpay_payment_id: string | null; amount: number; status: string; fulfillment_status: string; customer_name: string; email: string; phone: string; address: string; pincode: string; created_at: Date };

export async function reserveOrder(key: string, lines: CheckoutLine[], customer: CheckoutCustomer, userId: string) {
  await ensureCatalogue();
  const db = database();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existingRows] = await connection.execute<OrderRow[]>("SELECT * FROM kalacar_orders WHERE idempotency_key=? FOR UPDATE", [key]);
    if (existingRows[0]) {
      if (existingRows[0].user_id !== userId) throw new Error("ORDER_OWNER_MISMATCH");
      await connection.commit();
      const existing = existingRows[0];
      return { id: existing.id, amount: Number(existing.amount), razorpayOrderId: existing.razorpay_order_id, status: existing.status, reused: true };
    }
    const requested = [...lines].sort((a, b) => a.id.localeCompare(b.id));
    const items: Array<{ id: string; name: string; price: number; quantity: number }> = [];
    let amount = 0;
    for (const line of requested) {
      const [rows] = await connection.execute<ProductRow[]>("SELECT id,name,price,stock FROM kalacar_products WHERE id=? FOR UPDATE", [line.id]);
      const product = rows[0];
      if (!product || Number(product.stock) < line.quantity) throw new Error("INSUFFICIENT_STOCK");
      const [result] = await connection.execute<mysql.ResultSetHeader>("UPDATE kalacar_products SET stock=stock-? WHERE id=? AND stock>=?", [line.quantity, line.id, line.quantity]);
      if (result.affectedRows !== 1) throw new Error("INSUFFICIENT_STOCK");
      amount += Number(product.price) * line.quantity;
      items.push({ id: line.id, name: product.name, price: Number(product.price), quantity: line.quantity });
    }
    const id = randomUUID();
    await connection.execute("INSERT INTO kalacar_orders (id,user_id,idempotency_key,amount,status,customer_name,email,phone,address,pincode) VALUES (?,?,?,?,'payment_pending',?,?,?,?,?)", [id, userId, key, amount, customer.name, customer.email, customer.phone, customer.address, customer.pincode]);
    for (const item of items) await connection.execute("INSERT INTO kalacar_order_items (order_id,product_id,product_name,unit_price,quantity) VALUES (?,?,?,?,?)", [id, item.id, item.name, item.price, item.quantity]);
    await connection.commit();
    return { id, amount, razorpayOrderId: null, status: "payment_pending", reused: false };
  } catch (error) {
    await connection.rollback();
    if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY") {
      const [duplicates] = await db.execute<OrderRow[]>("SELECT * FROM kalacar_orders WHERE idempotency_key=?", [key]);
      if (duplicates[0]) {
        const duplicate = duplicates[0];
        if (duplicate.user_id !== userId) throw new Error("ORDER_OWNER_MISMATCH");
        return { id: duplicate.id, amount: Number(duplicate.amount), razorpayOrderId: duplicate.razorpay_order_id, status: duplicate.status, reused: true };
      }
    }
    throw error;
  } finally { connection.release(); }
}

export async function attachRazorpayOrder(id: string, razorpayOrderId: string) {
  await ensureCatalogue();
  await database().execute("UPDATE kalacar_orders SET razorpay_order_id=? WHERE id=? AND status='payment_pending'", [razorpayOrderId, id]);
}

export async function releaseOrderAfterPaymentSetupFailure(id: string) {
  await ensureCatalogue();
  const connection = await database().getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.execute<OrderRow[]>("SELECT * FROM kalacar_orders WHERE id=? FOR UPDATE", [id]);
    const order = orders[0];
    if (!order || order.status !== "payment_pending" || order.razorpay_order_id) { await connection.rollback(); return; }
    const [items] = await connection.execute<(RowDataPacket & { product_id: string; quantity: number })[]>("SELECT product_id,quantity FROM kalacar_order_items WHERE order_id=?", [id]);
    for (const item of items) await connection.execute("UPDATE kalacar_products SET stock=stock+? WHERE id=?", [item.quantity, item.product_id]);
    await connection.execute("UPDATE kalacar_orders SET status='payment_setup_failed' WHERE id=? AND status='payment_pending'", [id]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

export async function findOrder(id: string) {
  await ensureCatalogue();
  const [rows] = await database().execute<OrderRow[]>("SELECT * FROM kalacar_orders WHERE id=?", [id]);
  const order = rows[0];
  if (!order) return null;
  const [items] = await database().execute<(RowDataPacket & { product_id: string; product_name: string; unit_price: number; quantity: number })[]>("SELECT product_id,product_name,unit_price,quantity FROM kalacar_order_items WHERE order_id=?", [id]);
  return { id: order.id, userId: order.user_id, razorpayOrderId: order.razorpay_order_id, paymentId: order.razorpay_payment_id, amount: Number(order.amount), status: order.status, items: items.map(item => ({ id: item.product_id, name: item.product_name, price: Number(item.unit_price), quantity: Number(item.quantity) })) };
}

export async function createCustomer(name: string, email: string, phone: string, password: string) {
  await ensureCatalogue();
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64) as Buffer;
  const passwordHash = `${salt.toString("hex")}:${derived.toString("hex")}`;
  const id = randomUUID();
  await database().execute("INSERT INTO kalacar_users (id,name,email,phone,password_hash) VALUES (?,?,?,?,?)", [id, name, email, phone, passwordHash]);
  return { id, name, email, phone };
}

export async function authenticateCustomer(email: string, password: string) {
  await ensureCatalogue();
  const [rows] = await database().execute<(RowDataPacket & { id: string; name: string; email: string; phone: string; password_hash: string })[]>("SELECT id,name,email,phone,password_hash FROM kalacar_users WHERE email=?", [email]);
  const user = rows[0];
  if (!user) return null;
  const [saltHex, hashHex] = user.password_hash.split(":");
  const expected = Buffer.from(hashHex || "", "hex");
  const actual = await scrypt(password, Buffer.from(saltHex || "", "hex"), expected.length || 64) as Buffer;
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { id: user.id, name: user.name, email: user.email, phone: user.phone };
}

export async function createCustomerSession(userId: string) {
  await ensureCatalogue();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await database().execute("INSERT INTO kalacar_sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY))", [tokenHash, userId]);
  return token;
}

export async function findCustomerBySession(token: string) {
  await ensureCatalogue();
  const hash = createHash("sha256").update(token).digest("hex");
  const [rows] = await database().execute<(RowDataPacket & { id: string; name: string; email: string; phone: string })[]>("SELECT u.id,u.name,u.email,u.phone FROM kalacar_sessions s JOIN kalacar_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()", [hash]);
  return rows[0] ?? null;
}

export async function deleteCustomerSession(token: string) {
  await ensureCatalogue();
  const hash = createHash("sha256").update(token).digest("hex");
  await database().execute("DELETE FROM kalacar_sessions WHERE token_hash=?", [hash]);
}

export async function listCustomerOrders(userId: string) {
  await ensureCatalogue();
  const [orders] = await database().execute<OrderRow[]>("SELECT * FROM kalacar_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100", [userId]);
  return Promise.all(orders.map(async (order) => {
    const [items] = await database().execute<(RowDataPacket & { product_id: string; product_name: string; unit_price: number; quantity: number })[]>("SELECT product_id,product_name,unit_price,quantity FROM kalacar_order_items WHERE order_id=?", [order.id]);
    return { id: order.id, createdAt: order.created_at, amount: Number(order.amount), status: order.status, fulfillmentStatus: order.fulfillment_status, address: order.address, pincode: order.pincode, razorpayOrderId: order.razorpay_order_id, paymentId: order.razorpay_payment_id, items: items.map(item => ({ id: item.product_id, name: item.product_name, price: Number(item.unit_price), quantity: Number(item.quantity) })) };
  }));
}

export async function findCustomerOrder(id: string, userId: string) {
  await ensureCatalogue();
  const [rows] = await database().execute<OrderRow[]>("SELECT * FROM kalacar_orders WHERE id=? AND user_id=?", [id, userId]);
  if (!rows[0]) return null;
  return findOrder(id);
}

export async function markOrderPaymentFailed(id: string, userId: string, paymentId: string) {
  await ensureCatalogue();
  await database().execute("UPDATE kalacar_orders SET status='payment_failed',razorpay_payment_id=? WHERE id=? AND user_id=? AND status='payment_pending'", [paymentId, id, userId]);
}

export async function recordRazorpayWebhook(eventId: string, eventType: string, payment: { id: string; order_id: string; amount: number; currency: string; status: string }) {
  await ensureCatalogue();
  const connection = await database().getConnection();
  try {
    await connection.beginTransaction();
    const [orderRows] = await connection.execute<OrderRow[]>("SELECT * FROM kalacar_orders WHERE razorpay_order_id=? FOR UPDATE", [payment.order_id]);
    const order = orderRows[0];
    await connection.execute("INSERT IGNORE INTO kalacar_webhook_events (event_id,event_type) VALUES (?,?)", [eventId, eventType]);
    if (order && payment.amount === Number(order.amount) * 100 && payment.currency === "INR" && payment.status === "captured") await connection.execute("UPDATE kalacar_orders SET status='paid',razorpay_payment_id=? WHERE id=? AND status<>'paid'", [payment.id, order.id]);
    else if (order && payment.status === "failed") await connection.execute("UPDATE kalacar_orders SET status='payment_failed',razorpay_payment_id=? WHERE id=? AND status='payment_pending'", [payment.id, order.id]);
    await connection.commit();
    return Boolean(order);
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

export async function markOrderPaid(id: string, razorpayOrderId: string, paymentId: string) {
  await ensureCatalogue();
  await database().execute("UPDATE kalacar_orders SET status='paid',razorpay_payment_id=? WHERE id=? AND razorpay_order_id=? AND status<>'paid'", [paymentId, id, razorpayOrderId]);
  const order = await findOrder(id);
  return order?.status === "paid";
}

export async function listOrders() {
  await ensureCatalogue();
  const [orders] = await database().query<OrderRow[]>("SELECT * FROM kalacar_orders ORDER BY created_at DESC LIMIT 100");
  return Promise.all(orders.map(async order => {
    const [items] = await database().execute<(RowDataPacket & { product_name: string; quantity: number })[]>("SELECT product_name,quantity FROM kalacar_order_items WHERE order_id=?", [order.id]);
    const status = order.status === "payment_pending" ? "Awaiting payment" : order.status === "paid" ? "Paid" : order.status.replaceAll("_", " ");
    return { id: order.id, date: order.created_at, customer: order.customer_name, email: order.email, phone: order.phone, address: order.address, pincode: order.pincode, total: Number(order.amount), status, fulfillmentStatus: order.fulfillment_status, item: items.map(row => `${row.product_name} · ${row.quantity}`).join(", ") };
  }));
}

export async function getAdminMetrics() {
  await ensureCatalogue();
  const connection = await database().getConnection();
  const configuredThreshold = Number(process.env.KALACAR_LOW_STOCK_THRESHOLD ?? "3");
  const lowStockThreshold = Number.isSafeInteger(configuredThreshold) && configuredThreshold >= 1 && configuredThreshold <= 1_000_000 ? configuredThreshold : 3;
  let originalTimeZone: string | undefined;
  let reusableConnection = true;
  try {
    const [timeZoneRows] = await connection.query<(RowDataPacket & { session_time_zone: string })[]>("SELECT @@session.time_zone AS session_time_zone");
    const sessionTimeZone = String(timeZoneRows[0]?.session_time_zone ?? "");
    if (!/^(SYSTEM|[+-]\d{2}:\d{2}|[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*)$/.test(sessionTimeZone)) throw new Error("Database session timezone is not recognized.");
    originalTimeZone = sessionTimeZone;
    await connection.query("SET SESSION time_zone = '+05:30'");

    const [orderRows] = await connection.query<(RowDataPacket & {
      total_orders: number | string;
      paid_orders: number | string;
      revenue_today: number | string;
      revenue_month: number | string;
      paid_revenue: number | string;
      fulfillment_needed: number | string;
      payment_recovery: number | string;
    })[]>(`SELECT
      COUNT(*) AS total_orders,
      COALESCE(SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END),0) AS paid_orders,
      COALESCE(SUM(CASE WHEN status='paid' AND DATE(created_at)=CURRENT_DATE THEN amount ELSE 0 END),0) AS revenue_today,
      COALESCE(SUM(CASE WHEN status='paid' AND YEAR(created_at)=YEAR(CURRENT_DATE) AND MONTH(created_at)=MONTH(CURRENT_DATE) THEN amount ELSE 0 END),0) AS revenue_month,
      COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) AS paid_revenue,
      COALESCE(SUM(CASE WHEN status='paid' AND fulfillment_status='unfulfilled' THEN 1 ELSE 0 END),0) AS fulfillment_needed,
      COALESCE(SUM(CASE WHEN status IN ('payment_failed','payment_setup_failed') THEN 1 ELSE 0 END),0) AS payment_recovery
      FROM kalacar_orders`);
    const [productRows] = await connection.execute<(RowDataPacket & { low_stock_products: number | string; out_of_stock_products: number | string })[]>(`SELECT
      COALESCE(SUM(CASE WHEN stock > 0 AND stock <= ? THEN 1 ELSE 0 END),0) AS low_stock_products,
      COALESCE(SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END),0) AS out_of_stock_products
      FROM kalacar_products`, [lowStockThreshold]);
    const orderStats = orderRows[0];
    const paidOrders = Number(orderStats?.paid_orders ?? 0);
    const paidRevenue = Number(orderStats?.paid_revenue ?? 0);
    return {
      todayRevenue: Number(orderStats?.revenue_today ?? 0),
      monthRevenue: Number(orderStats?.revenue_month ?? 0),
      totalOrders: Number(orderStats?.total_orders ?? 0),
      paidOrders,
      averageOrderValue: paidOrders ? Math.round((paidRevenue / paidOrders) * 100) / 100 : 0,
      lowStockProducts: Number(productRows[0]?.low_stock_products ?? 0),
      outOfStockProducts: Number(productRows[0]?.out_of_stock_products ?? 0),
      lowStockThreshold,
      fulfillmentNeeded: Number(orderStats?.fulfillment_needed ?? 0),
      paymentRecovery: Number(orderStats?.payment_recovery ?? 0),
    };
  } finally {
    if (originalTimeZone !== undefined) {
      try { await connection.query(`SET SESSION time_zone = '${originalTimeZone}'`); }
      catch { connection.destroy(); reusableConnection = false; }
    }
    if (reusableConnection) connection.release();
  }
}

export async function updateOrderFulfillment(id: string, fulfillmentStatus: "processing" | "dispatched" | "completed") {
  await ensureCatalogue();
  const priorStatuses = { processing: ["unfulfilled", "processing"], dispatched: ["processing", "dispatched"], completed: ["dispatched", "completed"] }[fulfillmentStatus];
  const [result] = await database().execute<mysql.ResultSetHeader>("UPDATE kalacar_orders SET fulfillment_status=? WHERE id=? AND status='paid' AND fulfillment_status IN (?,?)", [fulfillmentStatus, id, ...priorStatuses]);
  return result.affectedRows > 0;
}

export async function updateProduct(id: string, values: { price?: number; stock?: number }) {
  await ensureCatalogue();
  const fields: string[] = [];
  const params: (string | number)[] = [];
  if (values.price !== undefined) { fields.push("price=?"); params.push(values.price); }
  if (values.stock !== undefined) { fields.push("stock=?"); params.push(values.stock); }
  if (!fields.length) throw new Error("No changes provided.");
  params.push(id);
  await database().execute<mysql.ResultSetHeader>(`UPDATE kalacar_products SET ${fields.join(",")} WHERE id=?`, params);
  return ["ganpati", "sri-krishna", "swami-samarth"].includes(id);
}
