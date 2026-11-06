"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSiteContent } from "@/components/site-content-provider";

const SWAG = 132;
const H = 76;
const around = (count: number, draw: (angle: number, index: number) => ReactNode) => Array.from({ length: count }, (_, index) => draw(index * 360 / count, index));
/** A point on the hanging curve, from 0 (left) to 1 (right). */
const dip = (t: number) => 3 + 4 * t * (1 - t) * 24;

const Marigold = ({ x, y, r, a = "#f59f0b", b = "#e8590c" }: { x: number; y: number; r: number; a?: string; b?: string }) => <g transform={`translate(${x} ${y})`}>
  {around(10, angle => <ellipse key={angle} cx="0" cy={-r * .72} rx={r * .36} ry={r * .46} fill={b} transform={`rotate(${angle})`} />)}
  {around(8, angle => <ellipse key={angle} cx="0" cy={-r * .42} rx={r * .28} ry={r * .36} fill={a} transform={`rotate(${angle + 20})`} />)}
  <circle r={r * .24} fill="#ffd43b" />
</g>;

const Hibiscus = ({ x, y, r }: { x: number; y: number; r: number }) => <g transform={`translate(${x} ${y})`}>
  {around(5, angle => <path key={angle} d={`M0 0C${-r * .75} ${-r * .35} ${-r * .55} ${-r * 1.1} 0 ${-r * 1.05}C${r * .55} ${-r * 1.1} ${r * .75} ${-r * .35} 0 0Z`} fill="url(#fo-hibiscus)" transform={`rotate(${angle})`} />)}
  <circle r={r * .22} fill="#7a0c1e" />
  <path d={`M0 0L${r * .8} ${-r * .7}`} stroke="#ffd43b" strokeWidth="1.4" strokeLinecap="round" />
  <circle cx={r * .8} cy={-r * .7} r="1.5" fill="#ffd43b" />
</g>;

const Leaf = ({ x, y, angle, size = 13 }: { x: number; y: number; angle: number; size?: number }) => <g transform={`translate(${x} ${y}) rotate(${angle})`}>
  <path d={`M0 0C${size * .38} ${size * .3} ${size * .38} ${size * .75} 0 ${size * 1.25}C${-size * .38} ${size * .75} ${-size * .38} ${size * .3} 0 0Z`} fill="#3f8f3a" />
  <path d={`M0 1V${size * 1.1}`} stroke="#205c22" strokeWidth=".8" />
</g>;

const HangingLamp = ({ t, color }: { t: number; color: string }) => {
  const x = t * SWAG, y = dip(t);
  return <g>
    <path d={`M${x} ${y + 5}v10`} stroke="#8a6a2a" strokeWidth="1" />
    <circle cx={x} cy={y + 24} r="13" fill="url(#fo-glow)" />
    <path d={`M${x} ${y + 14}c4 4 6 7 6 10a6 6 0 0 1-12 0c0-3 2-6 6-10Z`} fill={color} />
    <path d={`M${x} ${y + 20}c2 2 2.6 3.2 2.6 4.6a2.6 2.6 0 0 1-5.2 0c0-1.4.6-2.6 2.6-4.6Z`} fill="#fff8db" />
  </g>;
};

const Bell = ({ t }: { t: number }) => {
  const x = t * SWAG, y = dip(t);
  return <g transform={`translate(${x} ${y + 5})`}>
    <path d="M0 0v7" stroke="#8a6a2a" strokeWidth="1" />
    <path d="M0 7c5 0 6 4 6 8s2 5 3 6H-9c1-1 3-2 3-6s1-8 6-8Z" fill="url(#fo-gold)" />
    <circle cy="23" r="2" fill="#b8860b" />
  </g>;
};

const MiniPot = ({ t }: { t: number }) => {
  const x = t * SWAG, y = dip(t);
  return <g transform={`translate(${x} ${y + 5})`}>
    <path d="M-6 8 0 0l6 8" fill="none" stroke="#8a6a2a" strokeWidth="1" />
    <circle cy="19" r="10" fill="url(#fo-clay)" />
    <rect x="-5" y="7" width="10" height="4" rx="1.5" fill="#8a2f12" />
    <path d="M-9.5 17q9.500 4 19 0" fill="none" stroke="#ffd43b" strokeWidth="1.6" />
    <ellipse cy="8" rx="5" ry="2.6" fill="#fffdf2" />
  </g>;
};

const MiniFeather = ({ t }: { t: number }) => {
  const x = t * SWAG, y = dip(t);
  return <g transform={`translate(${x} ${y + 5})`}>
    <path d="M0 0V8" stroke="#7a8f3a" strokeWidth="1" />
    <ellipse cy="19" rx="6.500" ry="12" fill="url(#fo-feather)" />
    <ellipse cy="21" rx="3.600" ry="4.600" fill="#ffc53d" />
    <ellipse cy="21.500" rx="2.200" ry="3" fill="#127c8a" />
    <circle cy="22" r="1.300" fill="#1a2f8a" />
  </g>;
};

/** Glowing clay diya with a layered flame, painted bowl and flowers at its foot. */
const Diya = () => <svg viewBox="0 0 120 120" aria-hidden="true">
  <circle className="festive-glow" cx="60" cy="38" r="38" fill="url(#fo-glow)" />
  <ellipse cx="60" cy="112" rx="42" ry="5" fill="#000" opacity=".22" />
  <g className="festive-flame">
    <path d="M60 6C70 22 79 32 77 45 75 55 68 60 60 60S45 55 43 45C41 32 50 22 60 6Z" fill="url(#fo-flame)" />
    <path d="M60 24C66 33 70 38 69 46 68 52 64 56 60 56S52 52 51 46C50 38 54 33 60 24Z" fill="#ffd43b" />
    <path d="M60 38C63 42 65 45 64.500 49 64 52.500 62 54.500 60 54.500S56 52.500 55.500 49C55 45 57 42 60 38Z" fill="#fffbe6" />
  </g>
  <path d="M60 54v12" stroke="#3b2412" strokeWidth="3" strokeLinecap="round" />
  <path d="M10 64C12 90 36 108 60 108S108 90 110 64C96 72 24 72 10 64Z" fill="url(#fo-clay)" />
  <ellipse cx="60" cy="65" rx="50" ry="9" fill="#6b2410" stroke="#f2c14e" strokeWidth="2" />
  <ellipse cx="60" cy="66" rx="42" ry="5.500" fill="#d98a1f" opacity=".85" />
  {[-36, -24, -12, 0, 12, 24, 36].map(x => <g key={x} transform={`translate(${60 + x} ${88 - Math.abs(x) * .13})`}>
    <path d="M0-7C3-3 3 2 0 6-3 2-3-3 0-7Z" fill="#f2c14e" />
    <circle cy="9" r="1.400" fill="#fff3bf" />
  </g>)}
  <path d="M20 78C28 84 92 84 100 78" fill="none" stroke="#f2c14e" strokeWidth="1.400" strokeDasharray="1 5" strokeLinecap="round" />
  <path d="M24 76C30 92 42 100 52 103" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="4" strokeLinecap="round" />
  <Leaf x={14} y={100} angle={70} />
  <Leaf x={106} y={100} angle={-70} />
  <Marigold x={18} y={106} r={11} />
  <Marigold x={102} y={106} r={11} />
</svg>;

const Modak = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => <g transform={`translate(${x} ${y}) scale(${s})`}>
  <path d="M0-30C3-20 22-10 22 8 22 20 11 24 0 24S-22 20-22 8C-22-10-3-20 0-30Z" fill="url(#fo-modak)" />
  {[-13, -6.500, 0, 6.500, 13].map(x2 => <path key={x2} d={`M0-27C${x2 * .5}-14 ${x2}-4 ${x2} 22`} fill="none" stroke="#c28b47" strokeWidth="1" />)}
</g>;

/** Modak on a gold plate with a hibiscus. */
const ModakPlate = () => <svg viewBox="0 0 120 120" aria-hidden="true">
  <circle className="festive-glow" cx="60" cy="60" r="50" fill="url(#fo-glow)" />
  <ellipse cx="60" cy="112" rx="48" ry="5" fill="#000" opacity=".22" />
  <Modak x={38} y={72} s={.95} />
  <Modak x={82} y={72} s={.95} />
  <Modak x={60} y={46} s={1.05} />
  <Modak x={60} y={78} s={1.05} />
  <path d="M6 94C14 114 106 114 114 94Z" fill="url(#fo-gold)" />
  <ellipse cx="60" cy="94" rx="54" ry="7" fill="#ffe08a" stroke="#b8860b" strokeWidth="1.500" />
  {[-40, -20, 0, 20, 40].map(x => <circle key={x} cx={60 + x} cy={106 - Math.abs(x) * .08} r="1.800" fill="#8a5a00" />)}
  <Leaf x={12} y={84} angle={120} />
  <Hibiscus x={16} y={88} r={15} />
</svg>;

/** Dahi Handi: clay pot with butter, painted bands and a garland. */
const Handi = () => <svg viewBox="0 0 120 120" aria-hidden="true">
  <circle className="festive-glow" cx="60" cy="60" r="50" fill="url(#fo-glow)" />
  <ellipse cx="60" cy="113" rx="34" ry="5" fill="#000" opacity=".22" />
  <circle cx="60" cy="70" r="42" fill="url(#fo-clay)" />
  <path d="M19 62Q60 80 101 62" fill="none" stroke="#c92a2a" strokeWidth="7" />
  <path d="M18 72Q60 90 102 72" fill="none" stroke="#f2c14e" strokeWidth="2.500" strokeDasharray="1 6" strokeLinecap="round" />
  <path d="M24 92Q60 106 96 92" fill="none" stroke="#f2c14e" strokeWidth="2" />
  <rect x="36" y="22" width="48" height="12" rx="4" fill="#8a2f12" />
  <ellipse cx="60" cy="22" rx="31" ry="8" fill="#a8461f" stroke="#6b2410" strokeWidth="1.500" />
  <path d="M34 22C34 8 46 2 60 2S86 8 86 22C86 28 81 30 80 38 79 43 74 43 73 38 72 32 68 28 62 30 58 31 58 42 53 42 48 42 49 32 44 30 38 28 34 28 34 22Z" fill="#fffdf2" stroke="#ecdfb8" />
  {[-30, -15, 0, 15, 30].map(x => <Marigold key={x} x={60 + x} y={38 + Math.abs(x) * -.08} r={8} />)}
</svg>;

/** Peacock feather with Krishna's flute. */
const FeatherFlute = () => <svg viewBox="0 0 120 120" aria-hidden="true">
  <circle className="festive-glow" cx="62" cy="50" r="48" fill="url(#fo-glow)" />
  <g transform="rotate(14 62 110)">
    <path d="M62 112C62 90 60 76 60 60" fill="none" stroke="#7a8f3a" strokeWidth="2.400" strokeLinecap="round" />
    {around(44, (angle, index) => <path key={index} d="M0 -22 0 -39" stroke={index % 2 ? "#2f9e44" : "#12a0a8"} strokeWidth="1.300" strokeLinecap="round" transform={`translate(60 38) scale(.82 1) rotate(${angle})`} />)}
    <ellipse cx="60" cy="38" rx="24" ry="34" fill="url(#fo-feather)" />
    <ellipse cx="60" cy="42" rx="14" ry="17" fill="#ffc53d" />
    <ellipse cx="60" cy="44" rx="10" ry="12" fill="#127c8a" />
    <path d="M60 36c6 0 7 6 5 11-1 3-3 5-5 6-2-1-4-3-5-6-2-5-1-11 5-11Z" fill="#1a2f8a" />
  </g>
  <g transform="rotate(-22 60 92)">
    <rect x="4" y="86" width="112" height="9" rx="4.500" fill="url(#fo-gold)" />
    {[24, 40, 56, 72].map(x => <circle key={x} cx={x} cy="90.500" r="2" fill="#6b4300" />)}
    {[12, 96, 106].map(x => <rect key={x} x={x} y="86" width="3.500" height="9" fill="#c92a2a" />)}
  </g>
</svg>;

/** Diwali sky lantern, shown at the top corners on large screens. */
const Lantern = () => <svg viewBox="0 0 60 130" aria-hidden="true">
  <path d="M30 0v26" stroke="#8a6a2a" strokeWidth="1.200" />
  <circle className="festive-glow" cx="30" cy="54" r="30" fill="url(#fo-glow)" />
  <path d="M30 24 50 42 56 54 50 66 30 84 10 66 4 54 10 42Z" fill="#e8590c" />
  <path d="M30 24 42 54 30 84 18 54Z" fill="#ffb703" />
  <path d="M4 54H56M10 42H50M10 66H50" stroke="#fff3bf" strokeWidth="1.200" />
  {[20, 26, 34, 40].map((x, index) => <path key={x} d={`M${x} 82V${108 + index % 2 * 12}`} stroke={index % 2 ? "#f59f0b" : "#e8590c"} strokeWidth="2" strokeLinecap="round" />)}
</svg>;

const THEMES = {
  diwali: {
    wire: "#3f7d3a",
    garland: () => <>{[.1, .24, .38, .62, .76, .9].map(t => <Marigold key={t} x={t * SWAG} y={dip(t)} r={8} />)}<Marigold x={SWAG / 2} y={dip(.5)} r={9} a="#ffe066" b="#f59f0b" />{[.17, .83].map(t => <Leaf key={t} x={t * SWAG} y={dip(t) + 3} angle={t < .5 ? 16 : -16} />)}</>,
    hangA: () => <><HangingLamp t={.3} color="#ffb703" /><HangingLamp t={.7} color="#ff6b35" /></>,
    hangB: () => <HangingLamp t={.5} color="#ffd60a" />,
    left: <Diya />, right: <Diya />, lantern: true, shower: ["#ffd43b", "#ffb703", "#fff3bf"],
  },
  ganpati: {
    wire: "#2f7d32",
    garland: () => <>{[.1, .3, .5, .7, .9].map(t => <Hibiscus key={t} x={t * SWAG} y={dip(t)} r={9} />)}{[.2, .4, .6, .8].map(t => <Marigold key={t} x={t * SWAG} y={dip(t)} r={6} />)}{[.2, .8].map(t => <Leaf key={t} x={t * SWAG} y={dip(t) + 4} angle={t < .5 ? 14 : -14} size={15} />)}</>,
    hangA: () => <Bell t={.5} />,
    hangB: () => null,
    left: <ModakPlate />, right: <ModakPlate />, lantern: false, shower: ["#e03131", "#c92a2a", "#f59f0b"],
  },
  janmashtami: {
    wire: "#7a8f3a",
    garland: () => <>{[.1, .24, .38, .5, .62, .76, .9].map((t, index) => <Marigold key={t} x={t * SWAG} y={dip(t)} r={7} a={index % 2 ? "#ffe066" : "#fff"} b={index % 2 ? "#f59f0b" : "#ffd43b"} />)}</>,
    hangA: () => <><MiniFeather t={.24} /><MiniFeather t={.76} /></>,
    hangB: () => <MiniPot t={.5} />,
    left: <Handi />, right: <FeatherFlute />, lantern: false, shower: ["#12a0a8", "#2f9e44", "#ffc53d"],
  },
} as const;

const SHOWER = [6, 14, 23, 31, 42, 50, 59, 68, 76, 85, 93];

/** Festival decoration over the shop. It can't be clicked or read, and stays out of the cart and account. */
export function FestiveOverlay() {
  const { festive } = useSiteContent();
  const path = usePathname();
  if (festive.overlay === "off" || path.startsWith("/cart") || path.startsWith("/account")) return null;
  const theme = THEMES[festive.overlay];
  return <div className={`festive-overlay ${festive.overlay}`} aria-hidden="true">
    <svg width="0" height="0" className="festive-defs">
      <defs>
        <radialGradient id="fo-glow"><stop offset="0" stopColor="#ffd166" stopOpacity=".75" /><stop offset=".55" stopColor="#ffb703" stopOpacity=".25" /><stop offset="1" stopColor="#ffb703" stopOpacity="0" /></radialGradient>
        <linearGradient id="fo-flame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff6b1a" /><stop offset=".55" stopColor="#ff9f1c" /><stop offset="1" stopColor="#ffd43b" /></linearGradient>
        <linearGradient id="fo-clay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9652b" /><stop offset=".6" stopColor="#ad431b" /><stop offset="1" stopColor="#74280f" /></linearGradient>
        <linearGradient id="fo-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset=".5" stopColor="#e6a817" /><stop offset="1" stopColor="#a8720a" /></linearGradient>
        <linearGradient id="fo-modak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6dd" /><stop offset="1" stopColor="#ecc78e" /></linearGradient>
        <radialGradient id="fo-hibiscus"><stop offset="0" stopColor="#8f0d22" /><stop offset=".55" stopColor="#e03131" /><stop offset="1" stopColor="#ff6b6b" /></radialGradient>
        <linearGradient id="fo-feather" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12a0a8" /><stop offset=".6" stopColor="#2f9e44" /><stop offset="1" stopColor="#74a12e" /></linearGradient>
        <pattern id="fo-garland" width={SWAG} height={H} patternUnits="userSpaceOnUse">
          <path d={`M0 3Q${SWAG / 2} 51 ${SWAG} 3`} fill="none" stroke={theme.wire} strokeWidth="2" />
          {theme.garland()}
        </pattern>
        <pattern id="fo-hang-a" width={SWAG} height={H} patternUnits="userSpaceOnUse">{theme.hangA()}</pattern>
        <pattern id="fo-hang-b" width={SWAG} height={H} patternUnits="userSpaceOnUse">{theme.hangB()}</pattern>
      </defs>
    </svg>
    <svg className="festive-garland" width="100%" height={H}>
      <rect className="festive-hang-a" width="100%" height={H} fill="url(#fo-hang-a)" />
      <rect className="festive-hang-b" width="100%" height={H} fill="url(#fo-hang-b)" />
      <rect width="100%" height={H} fill="url(#fo-garland)" />
    </svg>
    {theme.lantern && <><span className="festive-lantern left"><Lantern /></span><span className="festive-lantern right"><Lantern /></span></>}
    {path === "/" && <>
      <span className="festive-corner left">{theme.left}</span>
      <span className="festive-corner right">{theme.right}</span>
    </>}
    <span className="festive-shower">{SHOWER.map((left, index) => <i key={left} style={{ left: `${left}%`, background: theme.shower[index % theme.shower.length], animationDelay: `${(index * 7 % 11) * .45}s`, animationDuration: `${6 + index % 4}s` }} />)}</span>
  </div>;
}
