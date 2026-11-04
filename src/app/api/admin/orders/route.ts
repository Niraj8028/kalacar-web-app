import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { getOrderStatusCounts, listOrders, type OrderStatusFilter } from "@/lib/catalogue-db";

const filters = new Set<OrderStatusFilter>(["all", "pending_payment", "processing", "on_hold", "dispatched", "completed", "cancelled", "refunded"]);

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 });
  const denied = await requireOwner();
  if (denied) return denied;
  const requestedFilter = new URL(request.url).searchParams.get("status") ?? "all";
  if (!filters.has(requestedFilter as OrderStatusFilter)) return NextResponse.json({ error: "Unknown order status filter." }, { status: 400 });
  try {
    const status = requestedFilter as OrderStatusFilter;
    const [orders, statusCounts] = await Promise.all([listOrders(status), getOrderStatusCounts()]);
    return NextResponse.json({ orders, statusCounts, total: statusCounts[status], listLimit: 100 }, { headers: { "Cache-Control": "no-store" } });
  }
  catch (error) {
    console.error("Owner orders unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Orders are temporarily unavailable." }, { status: 503 });
  }
}
