"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney, MIN_INCREMENT } from "@/lib/spots";
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
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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

  const preview = uploaded ?? logoBase64 ?? (logoUrl.trim() || null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("El logo debe pesar menos de 5MB.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo subir el logo");
      if (json.url) {
        setUploaded(json.url);
        setLogoBase64(null);
      } else {
        setLogoBase64(json.base64);
        setUploaded(null);
      }
      setLogoUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error subiendo el logo");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
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
          logoUrl: uploaded ?? (logoUrl.trim() || null),
          logoBase64,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo iniciar el pago");
      window.location.href = json.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
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
              {taken ? "Outbid" : "Zona libre"}
            </p>
            <h2 className="font-display text-2xl font-bold">{spot.displayName}</h2>
            <p className="mt-1 text-sm text-white/50">{spot.description}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full border border-white/10 px-3 py-1 text-white/60 transition hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Precio actual</span>
            <span className="font-semibold">
              {spot.currentPrice > 0 ? formatMoney(spot.currentPrice) : "—"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-white/50 text-sm">Debes pagar</span>
            <span className="font-display text-xl font-bold text-lime">
              {formatMoney(spot.nextBid)}
            </span>
          </div>
          {taken && (
            <p className="mt-2 text-[11px] text-white/40">
              Incremento mínimo {formatMoney(MIN_INCREMENT)}. Si tu marca ya estuvo aquí,
              solo pagas la diferencia.
            </p>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre de la marca *">
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
              Logo HD * (PNG o SVG, máx 5MB)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex-1 rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-white/70 transition hover:border-lime hover:text-lime"
              >
                {uploading ? "Subiendo…" : "Subir archivo"}
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
                setUploaded(null);
                setLogoBase64(null);
              }}
              className={`${inputCls} mt-2`}
              placeholder="…o pega la URL del logo"
            />
            {preview && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Vista previa" className="h-10 w-auto object-contain" />
                <span className="text-xs text-white/40">Vista previa</span>
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
              placeholder="tu@marca.com"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Sitio web">
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className={inputCls}
                placeholder="https://marca.com"
              />
            </Field>
            <Field label="Twitter / X">
              <input
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className={inputCls}
                placeholder="@marca"
              />
            </Field>
          </div>

          <Field label="Instagram">
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className={inputCls}
              placeholder="@marca"
            />
          </Field>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full rounded-xl bg-lime py-4 font-display text-base font-bold text-black transition hover:bg-neon disabled:opacity-50"
          >
            {submitting ? "Redirigiendo a Wompi…" : `Pagar ${formatMoney(spot.nextBid)}`}
          </button>
          <p className="text-center text-[11px] text-white/35">
            Pago seguro con Wompi. Tu logo aparece cuando la transacción es aprobada.
          </p>
        </form>
      </div>
    </div>
  );
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
