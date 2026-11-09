// Inline SVG icons for the storefront (no emoji or symbol glyphs). Decorative by default.
type IconProps = { size?: number; className?: string };
const base = (size: number, className?: string) => ({ viewBox: "0 0 24 24", width: size, height: size, className, fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const ArrowLeft = ({ size = 16, className }: IconProps) => <svg {...base(size, className)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
export const ArrowRight = ({ size = 16, className }: IconProps) => <svg {...base(size, className)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const External = ({ size = 14, className }: IconProps) => <svg {...base(size, className)}><path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" /></svg>;
export const UserCircle = ({ size = 18, className }: IconProps) => <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.25" /><circle cx="12" cy="9.75" r="3.25" /><path d="M5.9 18.6c1.3-2.4 3.5-3.6 6.1-3.6s4.800 1.200 6.100 3.600" /></svg>;
export const CheckMark = ({ size = 13, className }: IconProps) => <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.500 4.500 4.500L19 7.500" /></svg>;
export const BagIcon = ({ size = 18, className }: IconProps) => <svg {...base(size, className)}><path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>;
export const MenuIcon = ({ size = 18, className }: IconProps) => <svg {...base(size, className)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const CloseMark = ({ size = 18, className }: IconProps) => <svg {...base(size, className)}><path d="m6 6 12 12M18 6 6 18" /></svg>;
export const GiftIcon = ({ size = 20, className }: IconProps) => <svg {...base(size, className)}><rect x="3.5" y="9" width="17" height="11" rx="1.5" /><path d="M2.500 9h19V6h-19zM12 6v14M12 6C10.500 3 7 2.500 7 4.800 7 6 9.500 6 12 6Zm0 0c1.500-3 5-3.500 5-1.200C17 6 14.500 6 12 6Z" /></svg>;
export const Search = ({ size = 16, className }: IconProps) => <svg {...base(size, className)}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
export const Moon = ({ size = 15, className }: IconProps) => <svg {...base(size, className)}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>;
export const Sun = ({ size = 15, className }: IconProps) => <svg {...base(size, className)}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>;
