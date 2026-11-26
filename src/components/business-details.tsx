import type { BusinessDetails } from "@/data/site-content";
import { hasBusinessDetails } from "@/data/site-content";

const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** The shop's business name, address, email and phone, one per line, from Settings → Footer and menus. Nothing shows until one is filled in. */
export function BusinessDetailsBlock({ business, className }: { business: BusinessDetails | undefined; className: string }) {
  if (!business || !hasBusinessDetails(business)) return null;
  return <address className={className}>
    {business.name && <b>{business.name}</b>}
    {business.address && <span>{business.address}</span>}
    {business.email && <a href={`mailto:${business.email}`}>{business.email}</a>}
    {business.phone && <a href={tel(business.phone)}>{business.phone}</a>}
  </address>;
}
