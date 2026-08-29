"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/spots";
import type { SpotView } from "@/lib/types";

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
      title: "Pick your spot",
      body: "Spin the pack, look over the eight available spots, and choose where your logo lives.",
    },
    {
      n: "02",
      title: "Upload your logo and pay",
      body: "High-res PNG or SVG. You pay the current price plus the minimum increment, through Wompi.",
    },
    {
      n: "03",
      title: "I walk with your brand",
      body: "The moment the payment clears, your logo goes on the pack and hits the street with me every day.",
    },
  ];

  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
      <h2 className="font-display text-3xl font-bold sm:text-5xl">How it works</h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-lime/40"
          >
            <span className="font-display text-4xl font-bold text-lime/25">{s.n}</span>
            <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/55">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Leaderboard({
  spots,
  onSelect,
}: {
  spots: SpotView[];
  onSelect: (name: string) => void;
}) {
  const ranked = [...spots].sort((a, b) => b.currentPrice - a.currentPrice);

  return (
    <section id="leaderboard" className="mx-auto max-w-4xl px-5 py-20 sm:py-28">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-3xl font-bold sm:text-5xl">Leaderboard</h2>
        <p className="text-sm text-white/40">Who's walking with me</p>
      </div>

      <div className="mt-8 divide-y divide-white/5 overflow-hidden rounded-3xl border border-white/10">
        {ranked.map((s, i) => (
          <button
            key={s.name}
            onClick={() => onSelect(s.name)}
            className="flex w-full items-center gap-4 bg-white/[0.02] px-4 py-4 text-left transition hover:bg-white/[0.05] sm:px-6"
          >
            <span className="w-6 font-display text-sm text-white/30">{i + 1}</span>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
              {s.brand?.logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={s.brand.logo} alt={s.brand.name} className="h-8 w-8 object-contain" />
              ) : (
                <span className="text-lg text-white/20">+</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {s.brand?.name ?? <span className="text-white/35">Available</span>}
              </p>
              <p className="truncate text-xs text-white/40">{s.displayName}</p>
            </div>

            <div className="text-right">
              <p className="font-display font-bold">
                {s.currentPrice > 0 ? formatMoney(s.currentPrice) : formatMoney(s.minBid)}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-lime">
                {s.brand ? "Outbid" : "Open"}
              </p>
            </div>
          </button>
        ))}
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
      a: "I post photos and locations every week on the project's socials. I walk San Salvador every day — that's the whole point of this.",
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
        <p>A walking billboard in San Salvador. Payments secured by Wompi.</p>
        <p>© {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
