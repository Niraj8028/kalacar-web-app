import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-auth";
import { listCustomerOrders, listGuestOrders } from "@/lib/catalogue-db";
import { guestTokenHash } from "@/lib/order-access";

/** The signed-in account's orders, or, for a guest, the orders placed from this browser. */
export async function GET() {
  const customer = await currentCustomer();
  if (customer) return NextResponse.json({ orders: await listCustomerOrders(customer.id) }, { headers: { "Cache-Control": "no-store" } });
  const hash = await guestTokenHash();
  if (hash) return NextResponse.json({ orders: await listGuestOrders(hash), guest: true }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ error: "Sign in to view your orders." }, { status: 401 });
}
