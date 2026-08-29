/**
 * Wompi El Salvador opera en USD. Internamente todos los precios se guardan en
 * centavos (enteros) para no arrastrar errores de punto flotante.
 */
export const CURRENCY = "USD";

/** Incremento minimo para superar una puja, en centavos. */
export const MIN_INCREMENT = 500; // $5.00

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Centavos -> unidades decimales (lo que espera el campo `monto` de Wompi). */
export function centsToDecimal(cents: number): number {
  return Math.round(cents) / 100;
}
