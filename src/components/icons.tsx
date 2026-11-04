// Inline SVG icons for the storefront (no emoji or symbol glyphs). Decorative by default.
type IconProps = { size?: number; className?: string };
const base = (size: number, className?: string) => ({ viewBox: "0 0 24 24", width: size, height: size, className, fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const ArrowLeft = ({ size = 16, className }: IconProps) => <svg {...base(size, className)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
export const ArrowRight = ({ size = 16, className }: IconProps) => <svg {...base(size, className)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const External = ({ size = 14, className }: IconProps) => <svg {...base(size, className)}><path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" /></svg>;
export const Search = ({ size = 16, className }: IconProps) => <svg {...base(size, className)}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
export const Moon = ({ size = 15, className }: IconProps) => <svg {...base(size, className)}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>;
export const Sun = ({ size = 15, className }: IconProps) => <svg {...base(size, className)}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>;
