import { ManagedPage, pageMetadata } from "@/components/managed-page";

export const generateMetadata = () => pageMetadata("shipping");

export default function Page() {
  return <ManagedPage slug="shipping" />;
}
