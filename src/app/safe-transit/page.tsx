import { ManagedPage, pageMetadata } from "@/components/managed-page";

export const generateMetadata = () => pageMetadata("safe-transit");

export default function Page() {
  return <ManagedPage slug="safe-transit" />;
}
