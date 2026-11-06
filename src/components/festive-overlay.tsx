"use client";

import { usePathname } from "next/navigation";
import { useSiteContent } from "@/components/site-content-provider";

const SWAG = 132;
const flower = (x: number, y: number, r: number, fill: string) => <g key={`${x}-${y}`}>
  <circle cx={x} cy={y} r={r} fill={fill} />
  <circle cx={x} cy={y} r={r * .45} fill="#fbd24a" />
</g>;
/** A point on the hanging curve, from 0 (left) to 1 (right). */
const dip = (t: number) => 3 + 4 * t * (1 - t) * 26;
const flowers = [.08, .22, .36, .5, .64, .78, .92].map((t, index) => flower(t * SWAG, dip(t), 6, index % 2 ? "#e8590c" : "#f59f0b"));
const lamp = (t: number, on: string) => {
  const x = t * SWAG, y = dip(t);
  return <g key={t}>
    <path d={`M${x} ${y + 5}v9`} stroke="#6b4a1f" strokeWidth="1.2" />
    <circle cx={x} cy={y + 19} r="9" fill={on} opacity=".28" />
    <path d={`M${x} ${y + 13}c4 3 5 6 5 8a5 5 0 0 1-10 0c0-2 1-5 5-8Z`} fill={on} />
  </g>;
};

const Diya = () => <svg viewBox="0 0 64 64" aria-hidden="true">
  <circle className="festive-glow" cx="32" cy="24" r="20" fill="#fbbf24" opacity=".28" />
  <path className="festive-flame" d="M32 8c6 8 9 13 9 18a9 9 0 0 1-18 0c0-5 3-10 9-18Z" fill="#f59f0b" />
  <path className="festive-flame" d="M32 18c3 4 4 6 4 9a4 4 0 0 1-8 0c0-3 1-5 4-9Z" fill="#fff3bf" />
  <path d="M8 36c8 3 40 3 48 0-2 12-12 20-24 20S10 48 8 36Z" fill="#a8461f" />
  <path d="M8 36c8 3 40 3 48 0-8 6-40 6-48 0Z" fill="#6b2c12" />
  <path d="M18 47h28" stroke="#f2c14e" strokeWidth="2" strokeDasharray="2 4" strokeLinecap="round" />
</svg>;

/** Diwali lights and diyas over the shop. Purely decoration: it can't be clicked or read, and stays out of the cart and account. */
export function FestiveOverlay() {
  const { festive } = useSiteContent();
  const path = usePathname();
  if (!festive.diwali || path.startsWith("/cart") || path.startsWith("/account")) return null;
  return <div className="festive-overlay" aria-hidden="true">
    <svg className="festive-garland" width="100%" height="72">
      <defs>
        <pattern id="festive-toran" width={SWAG} height="72" patternUnits="userSpaceOnUse">
          <path d={`M0 3Q${SWAG / 2} 55 ${SWAG} 3`} fill="none" stroke="#3f7d3a" strokeWidth="2" />
          {flowers}
        </pattern>
        <pattern id="festive-lamps-a" width={SWAG} height="72" patternUnits="userSpaceOnUse">{lamp(.29, "#ffb703")}{lamp(.71, "#ff6b35")}</pattern>
        <pattern id="festive-lamps-b" width={SWAG} height="72" patternUnits="userSpaceOnUse">{lamp(.5, "#ffd60a")}</pattern>
      </defs>
      <rect className="festive-lamps-a" width="100%" height="72" fill="url(#festive-lamps-a)" />
      <rect className="festive-lamps-b" width="100%" height="72" fill="url(#festive-lamps-b)" />
      <rect width="100%" height="72" fill="url(#festive-toran)" />
    </svg>
    {path === "/" && <>
      <span className="festive-diya left"><Diya /></span>
      <span className="festive-diya right"><Diya /></span>
    </>}
  </div>;
}
