import { ManagedPage, pageMetadata } from "@/components/managed-page";

export const generateMetadata = () => pageMetadata("contact");

export default function Page() {
  return <ManagedPage slug="contact" />;
}
