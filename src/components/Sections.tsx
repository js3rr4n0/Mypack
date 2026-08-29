"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/spots";
import type { SpotView } from "@/lib/types";

/** ~4.200 impresiones al día caminando la ciudad. */
const DAILY_IMPRESSIONS = 4200;
const START = new Date("2026-01-01T00:00:00Z").getTime();

export function ImpressionCounter() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const compute = () => {
      const days = Math.max((Date.now() - START) / 86_400_000, 1);
      const perMs = (DAILY_IMPRESSIONS / 86_400_000) * 1000;
      setValue(Math.floor(days * DAILY_IMPRESSIONS + (Date.now() % 1000) * perMs));
    };
    compute();
    const id = setInterval(compute, 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="tabular-nums text-lime">
      {new Intl.NumberFormat("es-CO").format(value)}
    </span>
  );
}

export function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Elige tu zona",
      body: "Gira la mochila, mira las 6 zonas disponibles y elige dónde quieres que viva tu logo.",
    },
    {
      n: "02",
      title: "Sube tu logo y paga",
      body: "PNG o SVG en alta calidad. Pagas por Wompi el precio actual más el incremento mínimo.",
    },
    {
      n: "03",
      title: "Camino con tu marca",
      body: "Apenas se aprueba el pago, tu logo aparece en la mochila y sale a la calle conmigo cada día.",
    },
  ];

  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
      <h2 className="font-display text-3xl font-bold sm:text-5xl">Cómo funciona</h2>
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
        <p className="text-sm text-white/40">Quién está caminando conmigo</p>
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
                {s.brand?.name ?? <span className="text-white/35">Disponible</span>}
              </p>
              <p className="truncate text-xs text-white/40">{s.displayName}</p>
            </div>

            <div className="text-right">
              <p className="font-display font-bold">
                {s.currentPrice > 0 ? formatMoney(s.currentPrice) : formatMoney(s.minBid)}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-lime">
                {s.brand ? "Outbid" : "Libre"}
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
      q: "¿Cuánto dura mi logo en la mochila?",
      a: "Hasta que otra marca pague más por esa zona. Si te sacan, te aviso por email y puedes recuperarla pagando solo la diferencia.",
    },
    {
      q: "¿Qué formato debe tener el logo?",
      a: "PNG con fondo transparente o SVG, hasta 5MB. Entre más alta la resolución, mejor se ve impreso.",
    },
    {
      q: "¿Cómo sé que realmente uso la mochila?",
      a: "Publico fotos y ubicaciones cada semana en las redes del proyecto. Camino la ciudad todos los días, esa es la razón de ser de esto.",
    },
    {
      q: "¿Cómo se paga?",
      a: "Con Wompi: tarjeta, PSE, Nequi o Bancolombia. Tu logo se publica automáticamente cuando la transacción queda aprobada.",
    },
    {
      q: "¿Aceptan cualquier marca?",
      a: "No. Me reservo el derecho de rechazar contenido ilegal, ofensivo o político, y en ese caso devuelvo el pago completo.",
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
        <p>Un walking billboard en Colombia. Pagos por Wompi.</p>
        <p>© {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
