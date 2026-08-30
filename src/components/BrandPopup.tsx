"use client";

import { useEffect } from "react";
import { formatMoney } from "@/lib/spots";
import { BidPrice } from "./BidPrice";
import { instagramUrl, prettyDomain, safeUrl, twitterUrl } from "@/lib/links";
import type { SpotView } from "@/lib/types";

/**
 * Tarjeta de la marca que ocupa una zona.
 *
 * Es lo que la marca compra ademas del espacio en la tela: un sitio donde la
 * gente que ve el logo puede llegar a ella. Se abre al tocar el logo en la
 * mochila o su fila en el leaderboard.
 */
export default function BrandPopup({
  spot,
  onClose,
  onOutbid,
}: {
  spot: SpotView | null;
  onClose: () => void;
  onOutbid: (name: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (spot) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [spot, onClose]);

  const brand = spot?.brand;
  if (!spot || !brand) return null;

  const site = safeUrl(brand.website);
  const domain = prettyDomain(brand.website);
  const x = twitterUrl(brand.twitter);
  const ig = instagramUrl(brand.instagram);

  const links = [
    site && { label: domain ?? "Website", href: site, icon: "↗" },
    x && { label: `@${brand.twitter}`, href: x, icon: "𝕏" },
    ig && { label: `@${brand.instagram}`, href: ig, icon: "◎" },
  ].filter(Boolean) as { label: string; href: string; icon: string }[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={brand.name}
        className="w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0d0d0d] p-6 sm:rounded-3xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-lime">
            {spot.displayName}
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 rounded-full border border-white/10 px-3 py-1 text-white/60 transition hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          {brand.logo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={brand.logo}
              alt={brand.name}
              className="mb-4 h-16 w-auto max-w-[70%] object-contain"
            />
          )}
          <h2 className="font-display text-2xl font-bold">{brand.name}</h2>
          <p className="mt-1 text-sm text-white/45">
            Walking the city on this spot
          </p>
        </div>

        {links.length > 0 ? (
          <div className="mt-6 space-y-2">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm transition hover:border-lime/50 hover:bg-white/[0.06]"
              >
                <span className="flex items-center gap-3 truncate">
                  <span className="text-white/40">{l.icon}</span>
                  <span className="truncate">{l.label}</span>
                </span>
                <span className="shrink-0 text-white/30">→</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs text-white/35">
            This brand didn&apos;t leave any links.
          </p>
        )}

        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <BidPrice spot={spot} />
        </div>

        <button
          onClick={() => onOutbid(spot.name)}
          className="mt-5 w-full rounded-xl bg-lime py-3.5 font-display font-bold text-black transition hover:bg-neon"
        >
          Outbid for {formatMoney(spot.nextBid)}
        </button>
        <p className="mt-2 text-center text-[11px] text-white/30">
          Take this spot and your logo replaces theirs.
        </p>
      </div>
    </div>
  );
}
