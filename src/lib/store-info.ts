import { DEFAULT_PRODUCT_PAGE } from "@/data/site-content";

// Defaults for pages that can't read the owner's settings. The owner changes the delivery wording in
// Dashboard → Product page settings → Delivery.
export const DELIVERY_ESTIMATE = DEFAULT_PRODUCT_PAGE.delivery.estimate;

/** "Order updates go to …" with the email and, when there is one, the phone number. */
export function updatesGoTo(email: string, phone: string) {
  const number = phone.trim();
  return number ? `Order updates go to ${email} and ${number}.` : `Order updates go to ${email}.`;
}
