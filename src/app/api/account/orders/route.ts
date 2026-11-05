import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-auth";
import { listCustomerOrders } from "@/lib/catalogue-db";

export async function GET() {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Sign in to view your orders." }, { status: 401 });
  return NextResponse.json({ orders: await listCustomerOrders(customer.id) }, { headers: { "Cache-Control": "no-store" } });
}
