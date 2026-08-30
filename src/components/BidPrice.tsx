"use client";

import { formatMoney } from "@/lib/spots";
import type { SpotView } from "@/lib/types";

/**
 * Precio de una zona presentado como subasta y no como etiqueta de producto.
 *
 * Un solo numero se lee como "esto cuesta $1". Mostrar la puja actual junto al
 * minimo siguiente deja claro que hay alguien a quien superar, que es de lo que
 * va el sitio.
 */
export function BidPrice({
  spot,
  size = "md",
}: {
  spot: SpotView;
  size?: "sm" | "md" | "lg";
}) {
  const amount = {
    sm: "text-base",
    md: "text-xl",
    lg: "font-display text-3xl",
  }[size];

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
        {spot.currentPrice > 0 ? "Current bid" : "No bids yet"}
      </p>
      <p className={`${amount} font-display font-bold leading-tight`}>
        {spot.currentPrice > 0 ? formatMoney(spot.currentPrice) : "—"}
      </p>
      <p className="mt-0.5 text-[11px] text-lime">
        Min. next bid {formatMoney(spot.nextBid)}
      </p>
    </div>
  );
}

/** Etiqueta de estado para las listas. */
export function SpotStatus({ spot }: { spot: SpotView }) {
  return spot.brand ? (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/60">
      <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
      Taken
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-lime/15 px-2.5 py-1 text-[11px] font-semibold text-lime">
      <span className="h-1.5 w-1.5 rounded-full bg-lime" />
      Available
    </span>
  );
}
