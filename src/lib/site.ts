const FALLBACK_URL = "https://mypack.lol";

/** Lee una variable tratando el string vacio como ausente. */
function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

/**
 * URL publica del sitio, siempre absoluta y valida.
 *
 * Orden: NEXT_PUBLIC_SITE_URL -> VERCEL_PROJECT_PRODUCTION_URL -> VERCEL_URL
 * -> mypack.lol. Una variable vacia en el panel de Vercel no debe tumbar el
 * build, que fue justo lo que paso al desplegar por primera vez.
 */
export function siteUrl(): string {
  const explicit = env("NEXT_PUBLIC_SITE_URL");
  const vercel =
    env("VERCEL_PROJECT_PRODUCTION_URL") ?? env("NEXT_PUBLIC_VERCEL_URL") ?? env("VERCEL_URL");

  const candidate = explicit ?? (vercel ? `https://${vercel}` : undefined);
  if (!candidate) return FALLBACK_URL;

  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    console.warn(`[site] URL invalida: ${candidate}; se usa ${FALLBACK_URL}`);
    return FALLBACK_URL;
  }
}
