/**
 * Wompi El Salvador opera en USD; Wompi Colombia en COP.
 * Internamente TODO se guarda en centavos (enteros) sin importar la moneda,
 * asi el esquema de base de datos no cambia entre paises.
 */
export type Currency = "USD" | "COP";

export const CURRENCY: Currency =
  (process.env.NEXT_PUBLIC_CURRENCY as Currency) ?? "USD";

const LOCALE: Record<Currency, string> = {
  USD: "en-US",
  COP: "es-CO",
};

/** Incremento minimo para superar una puja, en centavos. */
export const MIN_INCREMENT: number = CURRENCY === "USD" ? 500 : 2_000_000;

export function formatMoney(cents: number, currency: Currency = CURRENCY): string {
  return new Intl.NumberFormat(LOCALE[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(cents / 100);
}

/** Centavos -> unidades decimales (lo que espera el campo `monto` de Wompi SV). */
export function centsToDecimal(cents: number): number {
  return Math.round(cents) / 100;
}
