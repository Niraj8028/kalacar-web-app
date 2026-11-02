import { NextResponse } from "next/server";
import { listProducts } from "@/lib/catalogue-db";

export async function GET() {
  try {
    return NextResponse.json({ products: await listProducts() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Catalogue API unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Catalogue is temporarily unavailable." }, { status: 503 });
  }
}
