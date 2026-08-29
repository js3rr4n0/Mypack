"use client";

import { formatCOP } from "@/lib/spots";
import type { SpotView } from "@/lib/types";

/**
 * Ilustracion semi-realista de la mochila con los logos vigentes pegados.
 * Sirve como fallback si el 3D no carga y como seccion "Asi se veria".
 */
export default function PackMockup({ spots }: { spots: SpotView[] }) {
  const by = Object.fromEntries(spots.map((s) => [s.name, s]));

  const slot = (
    name: string,
    x: number,
    y: number,
    w: number,
    h: number,
    fallback: string
  ) => {
    const brand = by[name]?.brand;
    return (
      <foreignObject key={name} x={x} y={y} width={w} height={h}>
        <div className="flex h-full w-full items-center justify-center rounded-md">
          {brand?.logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={brand.logo}
              alt={brand.name}
              className="max-h-full max-w-full object-contain drop-shadow"
            />
          ) : (
            <span className="rounded border border-dashed border-lime/40 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-lime/70">
              {fallback}
            </span>
          )}
        </div>
      </foreignObject>
    );
  };

  return (
    <div className="relative mx-auto w-full max-w-md">
      <svg viewBox="0 0 300 420" className="w-full drop-shadow-2xl">
        <defs>
          <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1c1c1c" />
            <stop offset="55%" stopColor="#101010" />
            <stop offset="100%" stopColor="#050505" />
          </linearGradient>
          <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#191919" />
            <stop offset="100%" stopColor="#0b0b0b" />
          </linearGradient>
        </defs>

        {/* asa */}
        <path
          d="M120 34 Q150 6 180 34"
          fill="none"
          stroke="#151515"
          strokeWidth="13"
          strokeLinecap="round"
        />

        {/* cuerpo */}
        <rect x="40" y="30" width="220" height="360" rx="34" fill="url(#body)" />

        {/* solapa superior */}
        <rect x="56" y="48" width="188" height="54" rx="22" fill="url(#panel)" />
        <path d="M62 76 H238" stroke="#242424" strokeWidth="2" />

        {/* panel frontal */}
        <rect x="58" y="112" width="184" height="180" rx="26" fill="url(#panel)" />
        <rect
          x="66"
          y="120"
          width="168"
          height="164"
          rx="22"
          fill="none"
          stroke="#202020"
          strokeWidth="1.5"
        />

        {/* bolsillo frontal */}
        <rect x="62" y="298" width="176" height="72" rx="20" fill="#0e0e0e" />

        {/* MOLLE */}
        {[318, 338, 358].map((y) => (
          <rect key={y} x="76" y={y} width="148" height="7" rx="3" fill="#080808" />
        ))}
        {[104, 150, 196].map((x) => (
          <rect key={x} x={x} y="314" width="6" height="48" rx="2" fill="#060606" />
        ))}

        {/* cremalleras */}
        <path d="M64 120 V284" stroke="#2b2b2b" strokeWidth="3" strokeDasharray="4 3" />
        <path d="M236 120 V284" stroke="#2b2b2b" strokeWidth="3" strokeDasharray="4 3" />

        {/* banda reflectiva */}
        <rect x="132" y="378" width="36" height="6" rx="3" fill="#8f8f8f" opacity="0.7" />

        {/* zonas con logos */}
        {slot("top_flap", 96, 56, 108, 38, "Solapa")}
        {slot("main_front", 84, 150, 132, 74, "Tu logo aquí")}
        {slot("front_pocket", 100, 300, 100, 30, "Bolsillo")}
        {slot("top_handle", 122, 12, 56, 22, "Asa")}
      </svg>

      <div className="mt-6 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        {spots.slice(0, 6).map((s) => (
          <div key={s.name} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
            <p className="truncate text-white/50">{s.displayName}</p>
            <p className="font-semibold text-white">{formatCOP(s.nextBid)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
