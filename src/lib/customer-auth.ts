import { cookies } from "next/headers";
import { findCustomerBySession } from "@/lib/catalogue-db";

export const CUSTOMER_COOKIE = "kalacar_customer_session";
export async function currentCustomer() {
  if (process.env.NODE_ENV !== "development") return null;
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  return token ? findCustomerBySession(token) : null;
}
