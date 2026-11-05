import { NextResponse, connection } from "next/server";
import { listProducts } from "@/lib/catalogue-db";
import { SHOP_CLOSED_MESSAGE, visitorStoreAccess } from "@/lib/store-status";

export async function GET() {
  await connection(); // always read live data, never a copy saved at build time
  try {
    if ((await visitorStoreAccess()).closed) return NextResponse.json({ error: SHOP_CLOSED_MESSAGE, comingSoon: true }, { status: 403, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ products: await listProducts() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Catalogue API unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Catalogue is temporarily unavailable." }, { status: 503 });
  }
}
