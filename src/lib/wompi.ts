import crypto from "crypto";

/**
 * Cliente Wompi (Colombia).
 *
 * Sandbox:    https://sandbox.wompi.co/v1
 * Produccion: https://production.wompi.co/v1
 *
 * Se soportan dos caminos de pago, ambos terminan en el webhook:
 *  1. Checkout web alojado por Wompi (recomendado, no toca datos de tarjeta).
 *  2. POST /v1/transactions directo, cuando el front ya tiene un token de
 *     metodo de pago (tarjeta tokenizada, nequi, etc).
 */

export const WOMPI_BASE_URL =
  process.env.WOMPI_BASE_URL ??
  (process.env.WOMPI_ENV === "production"
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1");

export const WOMPI_CHECKOUT_URL = "https://checkout.wompi.co/p/";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const publicKey = () => requireEnv("WOMPI_PUBLIC_KEY");
export const privateKey = () => requireEnv("WOMPI_PRIVATE_KEY");
export const integritySecret = () => requireEnv("WOMPI_INTEGRITY_SECRET");

export interface AcceptanceTokens {
  acceptance_token: string;
  accept_personal_auth: string;
  permalink: string;
  personalDataPermalink: string;
}

/** GET /v1/merchants/{public_key} -> tokens de aceptacion vigentes. */
export async function getAcceptanceTokens(): Promise<AcceptanceTokens> {
  const res = await fetch(`${WOMPI_BASE_URL}/merchants/${publicKey()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Wompi merchants ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  const data = json?.data ?? {};
  return {
    acceptance_token: data?.presigned_acceptance?.acceptance_token,
    accept_personal_auth:
      data?.presigned_personal_data_auth?.acceptance_token,
    permalink: data?.presigned_acceptance?.permalink,
    personalDataPermalink: data?.presigned_personal_data_auth?.permalink,
  };
}

/**
 * Firma de integridad exigida por Wompi:
 * SHA256(reference + amountInCents + currency + secretoDeIntegridad)
 */
export function integritySignature(
  reference: string,
  amountInCents: number,
  currency = "COP"
): string {
  return crypto
    .createHash("sha256")
    .update(`${reference}${amountInCents}${currency}${integritySecret()}`)
    .digest("hex");
}

export function checkoutUrl(params: {
  reference: string;
  amountInCents: number;
  customerEmail: string;
  redirectUrl: string;
  currency?: string;
}): string {
  const currency = params.currency ?? "COP";
  const qs = new URLSearchParams({
    "public-key": publicKey(),
    currency,
    "amount-in-cents": String(params.amountInCents),
    reference: params.reference,
    "signature:integrity": integritySignature(
      params.reference,
      params.amountInCents,
      currency
    ),
    "customer-data:email": params.customerEmail,
    "redirect-url": params.redirectUrl,
  });
  return `${WOMPI_CHECKOUT_URL}?${qs.toString()}`;
}

export interface CreateTransactionInput {
  amountInCents: number;
  customerEmail: string;
  reference: string;
  currency?: string;
  paymentMethod?: Record<string, unknown>;
  redirectUrl?: string;
}

/** POST /v1/transactions */
export async function createTransaction(input: CreateTransactionInput) {
  const tokens = await getAcceptanceTokens();
  const currency = input.currency ?? "COP";

  const body: Record<string, unknown> = {
    acceptance_token: tokens.acceptance_token,
    accept_personal_auth: tokens.accept_personal_auth,
    amount_in_cents: input.amountInCents,
    currency,
    customer_email: input.customerEmail,
    reference: input.reference,
    signature: integritySignature(input.reference, input.amountInCents, currency),
  };
  if (input.paymentMethod) body.payment_method = input.paymentMethod;
  if (input.redirectUrl) body.redirect_url = input.redirectUrl;

  const res = await fetch(`${WOMPI_BASE_URL}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${privateKey()}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Wompi transactions ${res.status}: ${JSON.stringify(json?.error ?? json)}`
    );
  }
  return json.data as {
    id: string;
    status: string;
    reference: string;
    payment_link_url?: string;
  };
}

/** GET /v1/transactions/{id} — usado para confirmar el estado real. */
export async function getTransaction(id: string) {
  const res = await fetch(`${WOMPI_BASE_URL}/transactions/${id}`, {
    headers: { Authorization: `Bearer ${privateKey()}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.data ?? null;
}

/**
 * Verifica la firma del evento de webhook.
 * checksum = SHA256(valores de signature.properties + timestamp + secreto_eventos)
 */
export function verifyWebhookSignature(event: {
  signature?: { properties?: string[]; checksum?: string };
  timestamp?: number;
  data?: Record<string, unknown>;
}): boolean {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret) return false;

  const properties = event?.signature?.properties;
  const checksum = event?.signature?.checksum;
  if (!Array.isArray(properties) || !checksum) return false;

  const concatenated = properties
    .map((path) =>
      path
        .split(".")
        .reduce<unknown>(
          (acc, key) =>
            acc && typeof acc === "object"
              ? (acc as Record<string, unknown>)[key]
              : undefined,
          event.data
        )
    )
    .join("");

  const computed = crypto
    .createHash("sha256")
    .update(`${concatenated}${event.timestamp ?? ""}${secret}`)
    .digest("hex");

  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(String(checksum).toLowerCase(), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function newReference(spotName: string): string {
  return `mypack-${spotName}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}`;
}
