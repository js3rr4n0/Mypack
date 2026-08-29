"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney, MIN_INCREMENT } from "@/lib/spots";
import {
  removeFlatBackground,
  hasFlatBackground,
  DARK_LOGO_THRESHOLD,
} from "@/lib/logo";
import type { SpotView } from "@/lib/types";

interface Props {
  spot: SpotView | null;
  onClose: () => void;
}

const MAX_BYTES = 5 * 1024 * 1024;

export default function BidModal({ spot, onClose }: Props) {
  const [brandName, setBrandName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  // El archivo se guarda en el navegador y solo se sube al enviar el
  // formulario, para poder recortarlo y compararlo antes de comprometerse.
  const [fileName, setFileName] = useState("logo.png");
  const [original, setOriginal] = useState<string | null>(null);
  const [cut, setCut] = useState<string | null>(null);
  const [useCut, setUseCut] = useState(false);
  const [canCut, setCanCut] = useState(false);
  const [cutting, setCutting] = useState(false);
  const [tooDark, setTooDark] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  if (!spot) return null;

  const preview = (useCut ? cut : original) ?? (logoUrl.trim() || null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("The logo must be under 5MB.");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    setFileName(file.name);
    setOriginal(dataUrl);
    setCut(null);
    setUseCut(false);
    setLogoUrl("");
    setTooDark(false);
    // Solo se ofrece el recorte si de verdad hay un fondo plano que quitar. Un
    // SVG es vectorial, y un PNG que ya trae transparencia no necesita nada.
    setCanCut(
      file.type === "image/svg+xml" ? false : await hasFlatBackground(file)
    );
  }

  /** Recorta el fondo bajo demanda y deja ver el resultado antes de decidir. */
  async function handleCut() {
    if (!original) return;
    setCutting(true);
    setError(null);
    try {
      const file = await dataUrlToFile(original, fileName);
      const cleaned = await removeFlatBackground(file);
      if (!cleaned.removed) {
        setError(
          "This logo has no flat background to remove — it is either already transparent or its backdrop is not a solid color."
        );
        setCanCut(false);
        return;
      }
      setCut(cleaned.dataUrl);
      setUseCut(true);
      setTooDark(cleaned.luminance < DARK_LOGO_THRESHOLD);
    } catch {
      setError("Could not process this image. You can upload it as it is.");
    } finally {
      setCutting(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      let uploadedUrl: string | null = null;
      let uploadedBase64: string | null = null;

      const chosen = useCut ? cut : original;
      if (chosen) {
        const form = new FormData();
        form.append("file", await dataUrlToFile(chosen, fileName));
        const up = await fetch("/api/upload", { method: "POST", body: form });
        const json = await up.json();
        if (!up.ok) throw new Error(json.error ?? "Could not upload the logo");
        uploadedUrl = json.url ?? null;
        uploadedBase64 = json.base64 ?? null;
      }

      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spot: spot!.name,
          brandName,
          email,
          website,
          twitter,
          instagram,
          logoUrl: uploadedUrl ?? (logoUrl.trim() || null),
          logoBase64: uploadedBase64,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not start the payment");
      window.location.href = json.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
      setSubmitting(false);
    }
  }

  const taken = Boolean(spot.brand);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0d0d0d] p-6 sm:rounded-3xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-lime">
              {taken ? "Outbid" : "Open spot"}
            </p>
            <h2 className="font-display text-2xl font-bold">{spot.displayName}</h2>
            <p className="mt-1 text-sm text-white/50">{spot.description}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-white/10 px-3 py-1 text-white/60 transition hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Current price</span>
            <span className="font-semibold">
              {spot.currentPrice > 0 ? formatMoney(spot.currentPrice) : "—"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-white/50 text-sm">You pay</span>
            <span className="font-display text-xl font-bold text-lime">
              {formatMoney(spot.nextBid)}
            </span>
          </div>
          {taken && (
            <p className="mt-2 text-[11px] text-white/40">
              Minimum increment {formatMoney(MIN_INCREMENT)}. If your brand held this spot
              before, you only pay the difference.
            </p>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Brand name *">
            <input
              required
              maxLength={100}
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className={inputCls}
              placeholder="Acme Inc."
            />
          </Field>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/50">
              HD logo * (PNG or SVG, max 5MB)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex-1 rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-white/70 transition hover:border-lime hover:text-lime"
              >
                {original ? "Choose another file" : "Upload a file"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
            <input
              value={logoUrl}
              onChange={(e) => {
                setLogoUrl(e.target.value);
                setOriginal(null);
                setCut(null);
                setUseCut(false);
                setCanCut(false);
                setTooDark(false);
              }}
              className={`${inputCls} mt-2`}
              placeholder="…or paste the logo URL"
            />
            {preview && (
              <div className="mt-3 space-y-2">
                {/* Vista previa sobre negro: es donde va a vivir el logo. */}
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-12 w-auto max-w-[60%] object-contain"
                  />
                  <span className="text-xs text-white/35">
                    How it will look on the pack
                  </span>
                </div>

                {tooDark && (
                  <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200/90">
                    Heads up: this logo is very dark, and the pack is black. It
                    will be hard to see. A white or light version reads much
                    better on the fabric.
                  </p>
                )}

                {canCut && !cut && (
                  <button
                    type="button"
                    onClick={handleCut}
                    disabled={cutting}
                    className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-white/75 transition hover:border-lime hover:text-lime disabled:opacity-50"
                  >
                    {cutting ? "Removing background…" : "Remove background"}
                  </button>
                )}

                {cut && (
                  <div className="space-y-2">
                    {/* Se dejan ver las dos, para que la marca elija. */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Original", src: original!, on: false },
                        { label: "No background", src: cut, on: true },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setUseCut(opt.on)}
                          className={`rounded-xl border bg-black p-2 transition ${
                            useCut === opt.on
                              ? "border-lime"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={opt.src}
                            alt={opt.label}
                            className="mx-auto h-10 w-auto max-w-full object-contain"
                          />
                          <span
                            className={`mt-1.5 block text-[10px] uppercase tracking-wider ${
                              useCut === opt.on ? "text-lime" : "text-white/40"
                            }`}
                          >
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-white/35">
                      Without the backdrop the logo sits on the fabric instead of
                      looking like a sticker. Pick whichever you prefer.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Field label="Email *">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="you@brand.com"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Website">
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className={inputCls}
                placeholder="https://brand.com"
              />
            </Field>
            <Field label="Twitter / X">
              <input
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className={inputCls}
                placeholder="@brand"
              />
            </Field>
          </div>

          <Field label="Instagram">
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className={inputCls}
              placeholder="@brand"
            />
          </Field>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || cutting}
            className="w-full rounded-xl bg-lime py-4 font-display text-base font-bold text-black transition hover:bg-neon disabled:opacity-50"
          >
            {submitting ? "Redirecting to Wompi…" : `Pay ${formatMoney(spot.nextBid)}`}
          </button>
          <p className="text-center text-[11px] text-white/35">
            Secure payment via Wompi. Your logo goes up once the transaction is approved.
          </p>
        </form>
      </div>
    </div>
  );
}

/** Convierte la vista previa elegida de vuelta en un archivo para subirlo. */
async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  const ext = blob.type === "image/svg+xml" ? "svg" : "png";
  const base = name.replace(/\.[^.]+$/, "") || "logo";
  return new File([blob], `${base}.${ext}`, { type: blob.type || "image/png" });
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-lime";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/50">
        {label}
      </label>
      {children}
    </div>
  );
}
