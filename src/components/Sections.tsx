"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/spots";
import { instagramUrl, prettyDomain, safeUrl, twitterUrl } from "@/lib/links";
import { BidPrice, SpotStatus } from "./BidPrice";
import type { RecentClaim, SpotView } from "@/lib/types";

/**
 * Visitas reales al sitio, contadas contra la base de datos.
 *
 * Registra la visita una sola vez por sesion del navegador y muestra el total.
 * Si la consulta falla no se muestra nada: antes este contador mostraba una
 * estimacion inventada, y un numero falso en la pagina es peor que ninguno.
 */
export function VisitCounter() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    const already = (() => {
      try {
        return sessionStorage.getItem("mypack:counted") === "1";
      } catch {
        return false;
      }
    })();

    fetch("/api/visit", { method: already ? "GET" : "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive || typeof json?.total !== "number") return;
        setTotal(json.total);
        try {
          sessionStorage.setItem("mypack:counted", "1");
        } catch {
          /* modo privado: se cuenta de nuevo, no pasa nada */
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  if (total === null) return null;

  return (
    <p className="mt-6 text-sm text-white/45">
      <span className="tabular-nums text-lime">
        {new Intl.NumberFormat("en-US").format(total)}
      </span>{" "}
      {total === 1 ? "visit" : "visits"} so far
    </p>
  );
}

export function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Choose a spot",
      body: "Pick where you want your logo on the backpack. Eight spots, each with its own price.",
    },
    {
      n: "02",
      title: "Place your bid",
      body: "Pay the current bid plus the minimum increment — or more, if you want to make it harder to take from you.",
    },
    {
      n: "03",
      title: "Own the spot",
      body: "Your logo goes up as soon as the payment clears, and stays there until another brand outbids you.",
    },
    {
      n: "04",
      title: "Get seen across El Salvador",
      body: "Your logo travels with me every day, all over El Salvador — the bus, the office, the queue for coffee.",
    },
  ];

  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
      <h2 className="font-display text-3xl font-bold sm:text-4xl">
        How the auction works
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div
            key={s.n}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-lime/40"
          >
            <span className="font-display text-2xl font-bold text-lime/30">{s.n}</span>
            <h3 className="mt-3 font-display text-base font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/55">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Ultimas zonas reclamadas. Si no hay ninguna, no se renderiza nada. */
export function RecentActivity({ recent }: { recent: RecentClaim[] }) {
  if (!recent.length) return null;

  const cuando = (at: RecentClaim["at"]) => {
    if (!at) return "";
    const mins = Math.floor((Date.now() - new Date(at).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="mx-auto max-w-4xl px-5">
      <ul className="flex flex-wrap justify-center gap-2">
        {recent.map((r, i) => (
          <li
            key={`${r.spot}-${i}`}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-white/55"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            <span className="text-white/80">{r.brand}</span> claimed{" "}
            <span className="text-white/80">{r.spot}</span>
            {r.amount ? (
              <span className="text-lime">{formatMoney(r.amount)}</span>
            ) : null}
            <span className="text-white/30">{cuando(r.at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Leaderboard({
  spots,
  onSelect,
  onOutbid,
}: {
  spots: SpotView[];
  onSelect: (name: string) => void;
  onOutbid: (name: string) => void;
}) {
  const libres = spots.filter((s) => !s.brand).length;
  const ranked = [...spots].sort((a, b) => b.currentPrice - a.currentPrice);

  return (
    <section id="leaderboard" className="mx-auto max-w-4xl px-5 py-16 sm:py-24">
      <h2 className="font-display text-3xl font-bold sm:text-4xl">
        {spots.length} advertising spots. That&apos;s it.
      </h2>
      <p className="mt-3 max-w-lg text-white/55">
        There is one backpack and it has {spots.length} surfaces.{" "}
        {libres > 0 ? (
          <>
            <span className="text-lime">{libres}</span>{" "}
            {libres === 1 ? "is" : "are"} still open. Once a spot is taken, the
            only way in is to outbid whoever holds it.
          </>
        ) : (
          <>All of them are taken. The only way in is to outbid someone.</>
        )}
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
        <div className="hidden grid-cols-[1fr_auto_auto] gap-4 border-b border-white/10 bg-white/[0.03] px-5 py-3 text-[11px] uppercase tracking-wider text-white/35 sm:grid">
          <span>Spot</span>
          <span className="text-right">Current bid</span>
          <span className="text-right">Status</span>
        </div>

        <div className="divide-y divide-white/5">
          {ranked.map((s) => {
            const site = safeUrl(s.brand?.website);
            const x = twitterUrl(s.brand?.twitter);
            const ig = instagramUrl(s.brand?.instagram);

            return (
              <div
                key={s.name}
                className="grid grid-cols-[1fr_auto] items-center gap-4 bg-white/[0.02] px-5 py-4 transition hover:bg-white/[0.04] sm:grid-cols-[1fr_auto_auto]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    onClick={() => onSelect(s.name)}
                    aria-label={s.brand ? s.brand.name : s.displayName}
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black transition hover:border-lime/50"
                  >
                    {s.brand?.logo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={s.brand.logo}
                        alt={s.brand.name}
                        className="h-7 w-7 object-contain"
                      />
                    ) : (
                      <span className="text-lg text-white/20">+</span>
                    )}
                  </button>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{s.displayName}</p>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      {s.brand ? (
                        site ? (
                          <a
                            href={site}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="truncate transition hover:text-lime"
                          >
                            {s.brand.name} <span className="text-white/25">↗</span>
                          </a>
                        ) : (
                          <span className="truncate">{s.brand.name}</span>
                        )
                      ) : (
                        <span>Nobody has claimed this one</span>
                      )}
                      {x && (
                        <a href={x} target="_blank" rel="noopener noreferrer nofollow"
                           className="transition hover:text-lime" aria-label="X">𝕏</a>
                      )}
                      {ig && (
                        <a href={ig} target="_blank" rel="noopener noreferrer nofollow"
                           className="transition hover:text-lime" aria-label="Instagram">◎</a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right sm:min-w-[120px]">
                  <BidPrice spot={s} size="sm" />
                </div>

                <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
                  <SpotStatus spot={s} />
                  <button
                    onClick={() => onOutbid(s.name)}
                    className="rounded-full bg-lime px-4 py-1.5 text-xs font-bold text-black transition hover:bg-neon"
                  >
                    {s.brand ? "Outbid" : "Claim"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FAQ() {
  const items = [
    {
      q: "How long does my logo stay on the pack?",
      a: "Until another brand pays more for that spot. If you get outbid I'll email you, and you can take it back by paying only the difference.",
    },
    {
      q: "What format should the logo be?",
      a: "PNG with a transparent background, or SVG, up to 5MB. The higher the resolution, the better it prints.",
    },
    {
      q: "How do I know you actually carry the pack?",
      a: "I post photos and locations every week on the project's socials. I'm out across El Salvador every day — that's the whole point of this.",
    },
    {
      q: "How do I pay?",
      a: "Through Wompi: credit or debit card, and QuickPay (QR). Your logo goes live automatically once the transaction is approved.",
    },
    {
      q: "Do you accept any brand?",
      a: "No. I reserve the right to turn down anything illegal, offensive, or political — and in that case I refund the payment in full.",
    },
  ];

  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-20 sm:py-28">
      <h2 className="font-display text-3xl font-bold sm:text-5xl">FAQ</h2>
      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 transition hover:border-white/20"
          >
            <summary className="cursor-pointer list-none font-medium marker:hidden">
              <span className="flex items-center justify-between gap-4">
                {item.q}
                <span className="text-lime transition group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-white/55">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/5 px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-white/35 sm:flex-row">
        <p className="font-display font-semibold text-white/70">mypack.lol</p>
        <p>A walking billboard across El Salvador. Payments secured by Wompi.</p>
        <p>© {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
