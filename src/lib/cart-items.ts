/** Validates cart lines from the browser (used by checkout and the coupon preview). */
export function parseCartItems(raw: unknown): { items: Array<{ id: string; variantId?: string; quantity: number }> } | { error: string } {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 10) return { error: "Your bag is empty or has too many different items." };
  const items: Array<{ id: string; variantId?: string; quantity: number }> = [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (!value || typeof value !== "object") return { error: "Invalid cart item." };
    const item = value as { id?: unknown; variantId?: unknown; quantity?: unknown };
    const variantId = typeof item.variantId === "string" && /^[a-z0-9-]{1,80}$/.test(item.variantId) ? item.variantId : undefined;
    const lineKey = `${String(item.id)}:${variantId ?? ""}`;
    if (typeof item.id !== "string" || !/^[a-z0-9-]{1,64}$/.test(item.id) || seen.has(lineKey) || !Number.isSafeInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 10) return { error: "Cart quantities must be whole numbers from 1 to 10." };
    seen.add(lineKey); items.push({ id: item.id, variantId, quantity: Number(item.quantity) });
  }
  return { items };
}
