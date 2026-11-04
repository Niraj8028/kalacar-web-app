import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-auth";
import { createAddress, listAddresses, parseAddress } from "@/lib/addresses";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Accounts are disabled outside development." }, { status: 403 });
  try {
    const user = await currentCustomer();
    if (!user) return NextResponse.json({ error: "Sign in to see your saved addresses." }, { status: 401 });
    return NextResponse.json({ addresses: await listAddresses(user.id) }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Saved addresses are unavailable right now." }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Accounts are disabled outside development." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid address." }, { status: 400 }); }
  const parsed = parseAddress(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const user = await currentCustomer();
    if (!user) return NextResponse.json({ error: "Sign in to save addresses." }, { status: 401 });
    const result = await createAddress(user.id, parsed.value, Boolean((body as { isDefault?: unknown }).isDefault === true));
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ address: result.value }, { status: 201 });
  } catch (error) {
    console.error("Saving address failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not save the address right now." }, { status: 503 });
  }
}
