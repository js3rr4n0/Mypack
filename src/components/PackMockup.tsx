"use client";

import { useEffect, useState } from "react";
import { SPOTS, formatMoney, type PhotoView } from "@/lib/spots";
import type { SpotView } from "@/lib/types";

/**
 * Fotos reales de la mochila con los logos vigentes compuestos encima.
 *
 * Los archivos van en public/pack/. Si falta alguno se muestra un marcador en
 * vez de una imagen rota. Las coordenadas de cada logo viven en el campo
 * `photo` de src/lib/spots.ts; para ajustarlas visualmente abre la pagina con
 * ?zonas=1 y se dibujan los recuadros de cada zona sobre la foto.
 */
const PHOTOS: Record<PhotoView, { src: string; alt: string; ratio: string }> = {
  front: {
    src: "/pack/front.jpg",
    alt: "Vista frontal de la mochila",
    ratio: "2 / 3",
  },
  angle: {
    src: "/pack/angle.jpg",
    alt: "Vista en ángulo de la mochila",
    ratio: "2 / 3",
  },
};

function PhotoWithLogos({
  view,
  spots,
  debug,
}: {
  view: PhotoView;
  spots: SpotView[];
  debug: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const photo = PHOTOS[view];
  const zones = SPOTS.filter((s) => s.photo.view === view);
  const by = Object.fromEntries(spots.map((s) => [s.name, s]));

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]"
      style={{ aspectRatio: photo.ratio }}
    >
      {failed ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
          <span className="text-3xl opacity-30">🎒</span>
          <p className="text-xs text-white/35">
            Falta <code className="text-white/50">public{photo.src}</code>
          </p>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={photo.src}
          alt={photo.alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}

      {!failed &&
        zones.map((zone) => {
          const brand = by[zone.name]?.brand;
          const { x, y, w, h, rotate } = zone.photo;

          if (!brand?.logo && !debug) return null;

          return (
            <div
              key={zone.name}
              className="pointer-events-none absolute flex items-center justify-center"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${w}%`,
                height: `${h}%`,
                transform: `translate(-50%, -50%) rotate(${rotate ?? 0}deg)`,
              }}
            >
              {brand?.logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="max-h-full max-w-full object-contain"
                  style={{
                    /* Sombra sutil para que el logo se asiente en la tela.
                       Sin mix-blend: con "screen" los logos oscuros desaparecen
                       sobre el cordura negro. */
                    filter: "drop-shadow(0 1px 3px rgba(0,0,0,.75))",
                  }}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded border border-dashed border-lime/50 bg-lime/5 text-[8px] font-bold uppercase tracking-wider text-lime/80">
                  {debug ? zone.name : "Tu logo"}
                </span>
              )}
            </div>
          );
        })}
    </div>
  );
}

export default function PackMockup({ spots }: { spots: SpotView[] }) {
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).has("zonas"));
  }, []);

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-3">
        <PhotoWithLogos view="front" spots={spots} debug={debug} />
        <PhotoWithLogos view="angle" spots={spots} debug={debug} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {spots.map((s) => (
          <div
            key={s.name}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-2"
          >
            <p className="truncate text-white/50">{s.displayName}</p>
            <p className="font-semibold text-white">{formatMoney(s.nextBid)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
