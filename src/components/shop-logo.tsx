import Image from "next/image";
import Link from "next/link";

/** The Kalacar logo, linking home, for pages other than the home page. */
export function ShopLogo() {
  return <Link className="shop-logo" href="/" aria-label="Kalacar home">
    <Image src="/images/kalakar-logo.png" alt="Kalacar" width={220} height={94} className="brand-logo" priority />
  </Link>;
}
