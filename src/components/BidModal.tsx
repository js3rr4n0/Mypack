"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney, MIN_INCREMENT } from "@/lib/spots";
import { removeFlatBackground, DARK_LOGO_THRESHOLD } from "@/lib/logo";
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
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [cutout, setCutout] = useState(true);
  const [hadBackground, setHadBackground] = useState(false);
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

  const preview = uploaded ?? logoBase64 ?? (logoUrl.trim() || null);

  async function handleFile(file: File, removeBg = cutout) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("The logo must be under 5MB.");
      return;
    }
    setRawFile(file);
    setUploading(true);
    try {
      let toUpload: File = file;

      // Los SVG ya son vectoriales y suelen venir con fondo transparente.
      if (removeBg && file.type !== "image/svg+xml") {
        try {
          const cleaned = await removeFlatBackground(file);
          setHadBackground(cleaned.removed);
          setTooDark(cleaned.luminance < DARK_LOGO_THRESHOLD);
          if (cleaned.removed) {
            const blob = await (await fetch(cleaned.dataUrl)).blob();
            toUpload = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".png", {
              type: "image/png",
            });
          }
        } catch {
          /* si el recorte falla se sube el original */
        }
      } else if (file.type !== "image/svg+xml") {
        setHadBackground(false);
      }

      const form = new FormData();
      form.append("file", toUpload);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not upload the logo");
      if (json.url) {
        setUploaded(json.url);
        setLogoBase64(null);
      } else {
        setLogoBase64(json.base64);
        setUploaded(null);
      }
      setLogoUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error uploading the logo");
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
                {uploading ? "Uploading…" : "Upload a file"}
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

                {hadBackground && (
                  <label className="flex cursor-pointer items-start gap-2 text-xs text-white/50">
                    <input
                      type="checkbox"
                      checked={cutout}
                      disabled={uploading}
                      onChange={(e) => {
                        setCutout(e.target.checked);
                        if (rawFile) handleFile(rawFile, e.target.checked);
                      }}
                      className="mt-0.5 accent-lime"
                    />
                    <span>
                      Background removed. Your logo had a flat backdrop — without
                      it, it sits on the fabric instead of looking like a sticker.
                      Uncheck to keep the original.
                    </span>
                  </label>
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
            disabled={submitting || uploading}
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
