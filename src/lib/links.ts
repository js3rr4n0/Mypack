/**
 * Enlaces de una marca.
 *
 * La web la escribe quien compra la zona, asi que es texto no confiable: si se
 * volcara tal cual en un href, un `javascript:...` se ejecutaria en el navegador
 * de cualquier visitante. Aqui solo sobreviven http y https.
 */
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Dominio a secas, para mostrarlo en pantalla sin el https:// ni la barra. */
export function prettyDomain(raw: string | null | undefined): string | null {
  const url = safeUrl(raw);
  if (!url) return null;
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const handle = (value: string | null | undefined) =>
  value ? value.trim().replace(/^@+/, "") : null;

export function twitterUrl(v: string | null | undefined): string | null {
  const h = handle(v);
  return h ? `https://x.com/${encodeURIComponent(h)}` : null;
}

export function instagramUrl(v: string | null | undefined): string | null {
  const h = handle(v);
  return h ? `https://instagram.com/${encodeURIComponent(h)}` : null;
}
