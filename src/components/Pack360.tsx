"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FRAMES, FRAME_RATIO } from "@/lib/pack-frames";
import { formatMoney } from "@/lib/spots";
import type { SpotView } from "@/lib/types";

/**
 * Vista 360: se arrastra con mouse o dedo para girar la mochila, y sobre cada
 * cuadro se componen los logos de las marcas que ocupan esas zonas.
 *
 * Las fotos van en public/pack/360/. Si falta alguna se muestra un marcador en
 * vez de una imagen rota, para que la pagina siga siendo navegable.
 */

/** Pixeles de arrastre necesarios para avanzar un cuadro. */
const DRAG_PER_FRAME = 45;

export default function Pack360({
  spots,
  onSelect,
}: {
  spots: SpotView[];
  onSelect?: (name: string) => void;
}) {
  const [index, setIndex] = useState(Math.floor(FRAMES.length / 2));
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState(false);
  const [debug, setDebug] = useState(false);
  const [missing, setMissing] = useState<Record<string, boolean>>({});

  const dragRef = useRef<{ startX: number; startIndex: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const by = useMemo(
    () => Object.fromEntries(spots.map((s) => [s.name, s])),
    [spots]
  );

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).has("zones"));
  }, []);

  // Precarga: sin esto, girar muestra un parpadeo blanco en cada cuadro nuevo.
  useEffect(() => {
    FRAMES.forEach((f) => {
      const img = new Image();
      img.src = f.src;
    });
  }, []);

  // Giro suave automatico hasta que el usuario toma el control.
  useEffect(() => {
    if (touched || FRAMES.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % FRAMES.length),
      2600
    );
    return () => clearInterval(id);
  }, [touched]);

  const wrap = useCallback(
    (i: number) => ((i % FRAMES.length) + FRAMES.length) % FRAMES.length,
    []
  );

  const onPointerDown = (e: React.PointerEvent) => {
    setTouched(true);
    setDragging(true);
    dragRef.current = { startX: e.clientX, startIndex: index };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = Math.round((e.clientX - drag.startX) / DRAG_PER_FRAME);
    if (delta !== 0) setIndex(wrap(drag.startIndex + delta));
  };

  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const frame = FRAMES[index];
  const isMissing = missing[frame.src];

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        role="group"
        aria-label="360 view of the pack"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            setTouched(true);
            setIndex((i) => wrap(i + 1));
          }
          if (e.key === "ArrowLeft") {
            setTouched(true);
            setIndex((i) => wrap(i - 1));
          }
        }}
        className={`relative w-full touch-none select-none overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d0d] outline-none focus-visible:border-lime/60 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ aspectRatio: FRAME_RATIO }}
      >
        {isMissing ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="text-4xl opacity-25">🎒</span>
            <p className="text-sm text-white/40">Missing photo</p>
            <code className="rounded bg-white/5 px-2 py-1 text-xs text-white/55">
              public{frame.src}
            </code>
          </div>
        ) : (
          FRAMES.map((f, i) => (
            /* Todos los cuadros montados y ocultos: cambiar de uno a otro es
               instantaneo en vez de disparar una carga nueva. */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={f.src}
              src={f.src}
              alt={`Backpack — ${f.label}`}
              draggable={false}
              onError={() => setMissing((m) => ({ ...m, [f.src]: true }))}
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                opacity: i === index ? 1 : 0,
                transition: "opacity 420ms cubic-bezier(.4,0,.2,1)",
                willChange: "opacity",
              }}
            />
          ))
        )}

        {!isMissing &&
          Object.entries(frame.zones).map(([name, zone]) => {
            const spot = by[name];
            const brand = spot?.brand;
            if (!brand?.logo && !debug) return null;

            return (
              <button
                key={name}
                onClick={() => onSelect?.(name)}
                aria-label={spot?.displayName ?? name}
                className="absolute flex items-center justify-center"
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.w}%`,
                  height: `${zone.h}%`,
                  transform: `translate(-50%, -50%) rotate(${zone.rotate ?? 0}deg) skewY(${zone.skew ?? 0}deg)`,
                  opacity: zone.opacity ?? 1,
                  transition: "opacity 420ms cubic-bezier(.4,0,.2,1)",
                }}
              >
                {brand?.logo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    draggable={false}
                    className="h-full w-full rounded-[4px] object-contain"
                    style={{
                      /* El logo tiene que parecer impreso sobre la tela, no
                         pegado encima:
                         - drop-shadow respeta el alfa (box-shadow dibujaria una
                           caja tambien en los PNG transparentes);
                         - el redondeo convierte un logo con fondo opaco en una
                           etiqueta, y es invisible si el fondo es transparente;
                         - brightness/contrast/saturate lo bajan a la luz de
                           estudio de la foto, que es apagada;
                         - el desenfoque de medio pixel imita como la tinta se
                           asienta sobre un tejido, que nunca da un filo perfecto;
                         - la opacidad justo por debajo de 1 deja ver la trama
                           del cordura a traves del logo. */
                      filter:
                        "drop-shadow(0 1px 2px rgba(0,0,0,.5)) brightness(.9) contrast(1.05) saturate(.93) blur(.3px)",
                      opacity: 0.94,
                    }}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded border border-dashed border-lime/50 bg-lime/5 text-[8px] font-bold uppercase tracking-wider text-lime/80">
                    {debug ? name : "Your logo"}
                  </span>
                )}
              </button>
            );
          })}

        {/* Etiqueta del cuadro actual */}
        <span className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60 backdrop-blur">
          {frame.label}
        </span>

        {/* Indicadores */}
        {FRAMES.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {FRAMES.map((f, i) => (
              <button
                key={f.src}
                aria-label={f.label}
                onClick={() => {
                  setTouched(true);
                  setIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-lime" : "w-1.5 bg-white/25 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-white/30">
        Drag to spin
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {spots.map((s) => (
          <button
            key={s.name}
            onClick={() => onSelect?.(s.name)}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-left transition hover:border-lime/50"
          >
            <p className="truncate text-white/50">{s.displayName}</p>
            <p className="font-semibold text-white">
              {s.brand?.name ?? formatMoney(s.nextBid)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
