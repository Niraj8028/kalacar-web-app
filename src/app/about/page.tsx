import { ManagedPage, pageMetadata } from "@/components/managed-page";

export const generateMetadata = () => pageMetadata("about");

export default function Page() {
  return <ManagedPage slug="about" />;
}
