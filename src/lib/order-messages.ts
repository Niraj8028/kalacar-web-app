import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";

// Messages the owner sends by hand from Orders. Each delivery status has its own templates, saved
// in its own settings row, so saving one status can never overwrite another.

export const MESSAGE_STATUSES = ["unfulfilled", "processing", "dispatched", "completed"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
export type MessageTemplate = { whatsapp: string; emailSubject: string; emailBody: string };

export const MESSAGE_VARIABLES = [
  { key: "customer_name", label: "Customer name" },
  { key: "first_name", label: "First name" },
  { key: "product_names", label: "Products" },
  { key: "order_id", label: "Order ID" },
  { key: "order_total", label: "Order total" },
  { key: "status", label: "Status" },
  { key: "courier", label: "Courier" },
  { key: "tracking_id", label: "Tracking ID" },
  { key: "tracking_link", label: "Tracking page" },
  { key: "tracking_note", label: "Tracking note" },
  { key: "shop_name", label: "Shop name" },
] as const;

const known = new Set<string>(MESSAGE_VARIABLES.map(variable => variable.key));
const LIMITS = { whatsapp: 1000, emailSubject: 150, emailBody: 1500 };
const FIELD_NAMES = { whatsapp: "WhatsApp message", emailSubject: "Email subject", emailBody: "Email message" };
const signOff = "\n\nThank you,\n{shop_name}";

export const DEFAULT_TEMPLATES: Record<MessageStatus, MessageTemplate> = {
  unfulfilled: {
    whatsapp: "Hi {first_name}, thank you for your {shop_name} order {order_id} ({product_names}). We have received it and will update you when it is being prepared.",
    emailSubject: "We received your {shop_name} order {order_id}",
    emailBody: `Hi {customer_name},\n\nThank you for your order {order_id}: {product_names}. We have received it and will update you when it is being prepared.${signOff}`,
  },
  processing: {
    whatsapp: "Hi {first_name}, your {shop_name} order {order_id} ({product_names}) is now being prepared.",
    emailSubject: "Your {shop_name} order {order_id} is being prepared",
    emailBody: `Hi {customer_name},\n\nYour order {order_id} ({product_names}) is now being prepared. We will update you when it is dispatched.${signOff}`,
  },
  dispatched: {
    whatsapp: "Hi {first_name}, your {shop_name} order {order_id} ({product_names}) has been dispatched by {courier}. Tracking ID: {tracking_id}. Track it here: {tracking_link}",
    emailSubject: "Your {shop_name} order {order_id} has been dispatched",
    emailBody: `Hi {customer_name},\n\nYour order {order_id} ({product_names}) has been dispatched by {courier}.\n\nTracking ID: {tracking_id}\nTrack it here: {tracking_link}${signOff}`,
  },
  completed: {
    whatsapp: "Hi {first_name}, your {shop_name} order {order_id} ({product_names}) has been delivered. Thank you for shopping with us.",
    emailSubject: "Your {shop_name} order {order_id} has been delivered",
    emailBody: `Hi {customer_name},\n\nYour order {order_id} ({product_names}) has been delivered. Thank you for shopping with us.${signOff}`,
  },
};

const rowName = (status: MessageStatus) => `order_message_${status}`;
export const isMessageStatus = (value: unknown): value is MessageStatus => MESSAGE_STATUSES.includes(value as MessageStatus);

export async function getMessageTemplates() {
  const db = await addressDb();
  const [rows] = await db.query<(RowDataPacket & { name: string; value: unknown })[]>("SELECT name,value FROM kalacar_settings WHERE name IN (?)", [MESSAGE_STATUSES.map(rowName)]);
  const templates = { ...DEFAULT_TEMPLATES };
  for (const status of MESSAGE_STATUSES) {
    const raw = rows.find(row => row.name === rowName(status))?.value;
    if (raw) templates[status] = { ...DEFAULT_TEMPLATES[status], ...(typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<MessageTemplate> };
  }
  return templates;
}

/** Refuses unknown variables, so a typo like {custmer_name} can't reach a customer. */
export function parseMessageTemplate(body: unknown): { error: string } | { value: MessageTemplate } {
  if (!body || typeof body !== "object") return { error: "Invalid template." };
  const input = body as Record<string, unknown>;
  const value = {} as MessageTemplate;
  for (const field of ["whatsapp", "emailSubject", "emailBody"] as const) {
    const text = typeof input[field] === "string" ? input[field].trim() : "";
    if (text.length > LIMITS[field]) return { error: `Keep the ${FIELD_NAMES[field].toLowerCase()} to ${LIMITS[field]} characters.` };
    for (const match of text.matchAll(/\{([^{}]*)\}/g)) if (!known.has(match[1])) return { error: `${FIELD_NAMES[field]}: {${match[1]}} isn't a variable. Use the buttons to insert one.` };
    if (/[{}]/.test(text.replace(/\{[^{}]*\}/g, ""))) return { error: `${FIELD_NAMES[field]}: check the curly brackets around variables.` };
    value[field] = text;
  }
  if (Boolean(value.emailSubject) !== Boolean(value.emailBody)) return { error: "An email needs both a subject and a message, or leave both empty." };
  return { value };
}

export async function saveMessageTemplate(status: MessageStatus, value: MessageTemplate) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_settings (name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [rowName(status), JSON.stringify(value)]);
}
