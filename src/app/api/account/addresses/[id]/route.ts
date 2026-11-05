import { NextResponse } from "next/server";
import { MINUTE, limitOrNull } from "@/lib/rate-limit";
import { currentCustomer } from "@/lib/customer-auth";
import { deleteAddress, parseAddress, updateAddress } from "@/lib/addresses";

const validId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

/** PATCH body: { setDefault: true } alone, or a full address (optionally with isDefault). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Address not found." }, { status: 404 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid address." }, { status: 400 }); }
  const onlyDefault = body.setDefault === true && Object.keys(body).length === 1;
  let input = null;
  if (!onlyDefault) {
    const parsed = parseAddress(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    input = parsed.value;
  }
  try {
    const user = await currentCustomer();
    if (!user) return NextResponse.json({ error: "Sign in to edit addresses." }, { status: 401 });
    const limited = limitOrNull([{ key: `addresses:user:${user.id}`, limit: 60, windowMs: 10 * MINUTE }]);
    if (limited) return limited;
    const address = await updateAddress(user.id, id, input, body.setDefault === true || body.isDefault === true);
    if (!address) return NextResponse.json({ error: "Address not found." }, { status: 404 });
    return NextResponse.json({ address });
  } catch (error) {
    console.error("Updating address failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not update the address right now." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Address not found." }, { status: 404 });
  try {
    const user = await currentCustomer();
    if (!user) return NextResponse.json({ error: "Sign in to delete addresses." }, { status: 401 });
    const limited = limitOrNull([{ key: `addresses:user:${user.id}`, limit: 60, windowMs: 10 * MINUTE }]);
    if (limited) return limited;
    if (!await deleteAddress(user.id, id)) return NextResponse.json({ error: "Address not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Deleting address failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not delete the address right now." }, { status: 503 });
  }
}
