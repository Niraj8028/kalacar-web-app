import { NextResponse } from "next/server";
import { MINUTE, limitOrNull } from "@/lib/rate-limit";
import { currentCustomer } from "@/lib/customer-auth";
import { createAddress, listAddresses, parseAddress } from "@/lib/addresses";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const user = await currentCustomer();
    if (!user) return NextResponse.json({ error: "Sign in to see your saved addresses." }, { status: 401 });
    return NextResponse.json({ addresses: await listAddresses(user.id) }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Saved addresses are unavailable right now." }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid address." }, { status: 400 }); }
  const parsed = parseAddress(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const user = await currentCustomer();
    if (!user) return NextResponse.json({ error: "Sign in to save addresses." }, { status: 401 });
    const limited = limitOrNull([{ key: `addresses:user:${user.id}`, limit: 60, windowMs: 10 * MINUTE }]);
    if (limited) return limited;
    const result = await createAddress(user.id, parsed.value, Boolean((body as { isDefault?: unknown }).isDefault === true));
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ address: result.value }, { status: 201 });
  } catch (error) {
    console.error("Saving address failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not save the address right now." }, { status: 503 });
  }
}
