import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";

// The label the owner prints and tapes on a parcel. A line whose variables are all empty is left out,
// so a label printed before the tracking ID exists has no blank "Tracking" line.

export type LabelTemplate = { deliverTo: string; from: string; details: string };

export const LABEL_VARIABLES = [
  { key: "customer_name", label: "Customer name" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "pincode", label: "PIN" },
  { key: "order_id", label: "Order ID" },
  { key: "order_date", label: "Order date" },
  { key: "product_names", label: "Products" },
  { key: "gift_line", label: "Gift packaging" },
  { key: "courier", label: "Courier" },
  { key: "tracking_id", label: "Tracking ID" },
  { key: "shop_name", label: "Shop name" },
] as const;

export const DEFAULT_LABEL: LabelTemplate = {
  deliverTo: "{customer_name}\n{phone}\n{address}\nPIN {pincode}",
  from: "{shop_name}",
  details: "Order {order_id} · {order_date}\n{product_names}\n{gift_line}\n{courier}: {tracking_id}",
};

const known = new Set<string>(LABEL_VARIABLES.map(variable => variable.key));
const FIELDS = { deliverTo: "Deliver to", from: "From", details: "Order details" } as const;

export async function getLabelTemplate(): Promise<LabelTemplate> {
  const db = await addressDb();
  const [rows] = await db.execute<(RowDataPacket & { value: unknown })[]>("SELECT value FROM kalacar_settings WHERE name='print_label'");
  const raw = rows[0]?.value;
  return { ...DEFAULT_LABEL, ...((typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<LabelTemplate> | undefined ?? {}) };
}

export function parseLabelTemplate(body: unknown): { error: string } | { value: LabelTemplate } {
  if (!body || typeof body !== "object") return { error: "Invalid template." };
  const input = body as Record<string, unknown>;
  const value = {} as LabelTemplate;
  for (const field of ["deliverTo", "from", "details"] as const) {
    const text = typeof input[field] === "string" ? input[field].trim() : "";
    if (text.length > 600) return { error: `Keep ${FIELDS[field]} to 600 characters.` };
    for (const match of text.matchAll(/\{([^{}]*)\}/g)) if (!known.has(match[1])) return { error: `${FIELDS[field]}: {${match[1]}} isn't a variable. Use the buttons to insert one.` };
    if (/[{}]/.test(text.replace(/\{[^{}]*\}/g, ""))) return { error: `${FIELDS[field]}: check the curly brackets around variables.` };
    value[field] = text;
  }
  if (!value.deliverTo) return { error: "The Deliver to section can't be empty." };
  return { value };
}

export async function saveLabelTemplate(value: LabelTemplate) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_settings (name,value) VALUES ('print_label',?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [JSON.stringify(value)]);
}
