import type { ProductAccordion } from "@/data/catalogue";

export type ProductAccordionRow = { label: string; value: string };

export function parseProductAccordionRows(content: string): ProductAccordionRow[] | null {
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  const rows: ProductAccordionRow[] = [];
  for (const line of lines) {
    const separator = line.indexOf(": ");
    if (separator < 1 || separator > 80) return null;
    const label = line.slice(0, separator).trim();
    const value = line.slice(separator + 2).trim();
    if (!label || !value) return null;
    rows.push({ label, value });
  }
  return rows;
}

export function parseProductAccordions(value: unknown): ProductAccordion[] | null {
  let candidate = value;
  if (typeof candidate === "string") {
    try { candidate = JSON.parse(candidate); } catch { return null; }
  }
  if (!Array.isArray(candidate) || candidate.length > 12) return null;
  const result: ProductAccordion[] = [];
  for (const raw of candidate) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== "string" || item.id.length < 1 || item.id.length > 64 ||
        typeof item.title !== "string" || (item.active && !item.title.trim()) || item.title.trim().length > 80 ||
        typeof item.content !== "string" || (item.active && !item.content.trim()) || item.content.trim().length > 3000 ||
        (item.format !== undefined && item.format !== "rows" && item.format !== "text") ||
        (item.active && item.format === "rows" && !parseProductAccordionRows(item.content)) ||
        typeof item.active !== "boolean" || typeof item.defaultOpen !== "boolean") return null;
    result.push({ id: item.id, title: item.title.trim(), content: item.content.trim(), ...(item.format ? { format: item.format } : {}), active: item.active, defaultOpen: item.defaultOpen });
  }
  return result;
}
