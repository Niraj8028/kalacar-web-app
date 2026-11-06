import { ManagedPage, pageMetadata } from "@/components/managed-page";

export const generateMetadata = () => pageMetadata("returns");

export default function Page() {
  return <ManagedPage slug="returns" />;
}
