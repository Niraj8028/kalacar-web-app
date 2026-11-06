import { ManagedPage, pageMetadata } from "@/components/managed-page";

export const generateMetadata = () => pageMetadata("terms");

export default function Page() {
  return <ManagedPage slug="terms" />;
}
