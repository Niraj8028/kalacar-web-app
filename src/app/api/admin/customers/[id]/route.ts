import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { getCustomer } from "@/lib/customers";

const noStore = { "Cache-Control": "no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 });
  const denied = await requireOwner();
  if (denied) return denied;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  try {
    const customer = await getCustomer(id);
    return customer ? NextResponse.json({ customer }, { headers: noStore }) : NextResponse.json({ error: "Customer not found." }, { status: 404 });
  } catch (error) {
    console.error("Customer details unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Customer details are temporarily unavailable." }, { status: 503, headers: noStore });
  }
}
