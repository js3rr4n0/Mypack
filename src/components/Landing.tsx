"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import BidModal from "./BidModal";
import CanvasBoundary from "./CanvasBoundary";
import Pack360 from "./Pack360";
import { FAQ, Footer, HowItWorks, ImpressionCounter, Leaderboard } from "./Sections";
import { SPOTS, formatMoney, type SpotName } from "@/lib/spots";
import type { SpotView } from "@/lib/types";

const Backpack3D = dynamic(() => import("./Backpack3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] min-h-[420px] items-center justify-center text-sm text-white/30">
      Cargando la mochila…
    </div>
  ),
});

const FALLBACK: SpotView[] = SPOTS.map((s, i) => ({
  id: i + 1,
  name: s.name,
  displayName: s.displayName,
  description: s.description,
  positionOrder: s.positionOrder,
  minBid: s.minBid,
  currentPrice: 0,
  isActive: true,
  nextBid: s.minBid,
  brand: null,
}));

export default function Landing() {
  const [spots, setSpots] = useState<SpotView[]>(FALLBACK);
  const [selected, setSelected] = useState<SpotName | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/spots")
      .then((r) => r.json())
      .then((json) => {
        if (alive && Array.isArray(json.spots)) setSpots(json.spots);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const select = useCallback((name: string) => setSelected(name as SpotName), []);

  const selectedSpot = useMemo(
    () => spots.find((s) => s.name === selected) ?? null,
    [spots, selected]
  );

  const cheapest = useMemo(
    () => spots.reduce((min, s) => (s.nextBid < min.nextBid ? s : min), spots[0]),
    [spots]
  );

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-white/5 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <a href="#top" className="font-display text-sm font-bold tracking-tight">
            mypack<span className="text-lime">.lol</span>
          </a>
          <div className="hidden gap-7 text-sm text-white/50 sm:flex">
            <a href="#mochila" className="transition hover:text-white">La mochila</a>
            <a href="#como-funciona" className="transition hover:text-white">Cómo funciona</a>
            <a href="#leaderboard" className="transition hover:text-white">Leaderboard</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
          </div>
          <button
            onClick={() => select(cheapest?.name ?? "main_front")}
            className="rounded-full bg-lime px-4 py-2 text-xs font-bold text-black transition hover:bg-neon"
          >
            Poner mi logo
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header id="top" className="relative overflow-hidden px-5 pt-16 sm:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-lime/10 blur-[130px]"
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" />
            Subasta abierta · 6 zonas
          </span>

          <h1 className="mt-7 font-display text-[13vw] font-bold leading-[0.92] tracking-tight sm:text-7xl lg:text-8xl">
            My Pack.
            <br />
            <span className="text-lime">Your Brand.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
            Tu logo camina conmigo todos los días por la ciudad.
          </p>

          <p className="mt-6 text-sm text-white/45">
            <ImpressionCounter /> impresiones estimadas desde que empecé
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => select(cheapest?.name ?? "main_front")}
              className="glow w-full rounded-full bg-lime px-8 py-4 font-display text-base font-bold text-black transition hover:bg-neon sm:w-auto"
            >
              Poner mi logo
            </button>
            <a
              href="#mochila"
              className="w-full rounded-full border border-white/15 px-8 py-4 text-center font-display text-base font-semibold text-white/80 transition hover:border-white/40 sm:w-auto"
            >
              Ver la mochila
            </a>
          </div>

          <p className="mt-4 text-xs text-white/30">
            Desde {formatMoney(cheapest?.nextBid ?? 0)} · pago seguro con Wompi
          </p>
        </div>
      </header>

      {/* Mochila 3D */}
      <section id="mochila" className="mt-10 sm:mt-16">
        <CanvasBoundary
          fallback={
            <div className="flex h-[70vh] min-h-[420px] flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="text-4xl opacity-25">🎒</span>
              <p className="max-w-xs text-sm text-white/45">
                Tu navegador no pudo cargar la mochila en 3D. Más abajo puedes
                verla en fotos y elegir tu zona igual.
              </p>
              <a
                href="#mochila-360"
                className="rounded-full border border-white/15 px-5 py-2 text-xs font-semibold transition hover:border-lime hover:text-lime"
              >
                Ver en fotos
              </a>
            </div>
          }
        >
          <Backpack3D spots={spots} onSelect={select} />
        </CanvasBoundary>

        <div className="mx-auto mt-4 grid max-w-4xl grid-cols-2 gap-2 px-5 sm:grid-cols-3">
          {spots.map((s) => (
            <button
              key={s.name}
              onClick={() => select(s.name)}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-lime/50"
            >
              <p className="truncate text-xs text-white/45">{s.displayName}</p>
              <p className="truncate text-sm font-semibold">
                {s.brand?.name ?? formatMoney(s.nextBid)}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Así se vería */}
      <section id="mochila-360" className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-5xl">
              Así se vería tu logo
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-white/55">
              Impreso en alta calidad sobre cordura negro. Sin stickers baratos: parches y
              vinilo termoadhesivo que aguantan lluvia, microbuses y cinco kilómetros
              diarios a pie.
            </p>
            <ul className="mt-7 space-y-3 text-sm text-white/60">
              {[
                "Logo en alta resolución, PNG o SVG",
                "Fotos semanales del pack en la calle",
                "Tu link en el leaderboard mientras seas dueño de la zona",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <Pack360 spots={spots} onSelect={select} />
        </div>
      </section>

      <HowItWorks />
      <Leaderboard spots={spots} onSelect={select} />
      <FAQ />

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-5 pb-20">
        <div className="rounded-3xl border border-lime/20 bg-lime/[0.05] p-10 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            La ciudad ya está caminando.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/55">
            La única pregunta es qué logo va a ver hoy.
          </p>
          <button
            onClick={() => select(cheapest?.name ?? "main_front")}
            className="mt-7 rounded-full bg-lime px-8 py-4 font-display font-bold text-black transition hover:bg-neon"
          >
            Poner mi logo
          </button>
        </div>
      </section>

      <Footer />

      <BidModal spot={selectedSpot} onClose={() => setSelected(null)} />
    </main>
  );
}
