import { ManagedPage, pageMetadata } from "@/components/managed-page";

export const generateMetadata = () => pageMetadata("privacy");

export default function Page() {
  return <ManagedPage slug="privacy" />;
}
