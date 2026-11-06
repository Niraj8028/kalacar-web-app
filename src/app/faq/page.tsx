import { ManagedPage, pageMetadata } from "@/components/managed-page";

export const generateMetadata = () => pageMetadata("faq");

export default function Page() {
  return <ManagedPage slug="faq" />;
}
