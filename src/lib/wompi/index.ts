import crypto from "crypto";
import * as sv from "./sv";
import * as co from "./co";

/**
 * Fachada sobre los dos Wompi. Se elige con WOMPI_COUNTRY:
 *   SV (por defecto) -> OAuth App ID + API Secret, USD, Enlace de Pago.
 *   CO               -> llaves pub_/prv_, COP, checkout + /v1/transactions.
 */
export type WompiCountry = "SV" | "CO";

export const COUNTRY: WompiCountry =
  (process.env.WOMPI_COUNTRY as WompiCountry) ?? "SV";

export function newReference(spotName: string): string {
  return `mypack-${spotName}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}`;
}

/** Token secreto que viaja en la URL del webhook (Wompi SV no firma sus eventos). */
export function webhookUrl(origin: string): string {
  const secret = process.env.WOMPI_WEBHOOK_TOKEN;
  return `${origin}/api/webhook/wompi${secret ? `?token=${encodeURIComponent(secret)}` : ""}`;
}

export interface CheckoutInput {
  reference: string;
  amountInCents: number;
  customerEmail: string;
  productName: string;
  description?: string;
  origin: string;
}

export interface CheckoutResult {
  url: string;
  providerId?: string;
}

/** Arranca el cobro y devuelve la URL a la que hay que redirigir al comprador. */
export async function startCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const redirectUrl = `${input.origin}/gracias?ref=${encodeURIComponent(input.reference)}`;

  if (COUNTRY === "CO") {
    return {
      url: co.checkoutUrl({
        reference: input.reference,
        amountInCents: input.amountInCents,
        customerEmail: input.customerEmail,
        redirectUrl,
      }),
    };
  }

  const link = await sv.createPaymentLink({
    reference: input.reference,
    amountInCents: input.amountInCents,
    productName: input.productName,
    description: input.description,
    redirectUrl,
    webhookUrl: webhookUrl(input.origin),
    notifyEmail: input.customerEmail,
  });

  return { url: link.urlEnlace, providerId: String(link.idEnlace) };
}

export type PaymentStatus = "approved" | "declined" | "pending";

export interface NormalizedEvent {
  reference: string | null;
  transactionId: string | null;
  status: PaymentStatus;
}

/**
 * Normaliza el evento entrante y — importante — reconsulta el estado contra la
 * API de Wompi en vez de confiar en el cuerpo del webhook.
 */
export async function resolveEvent(
  payload: Record<string, unknown>,
  searchParams: URLSearchParams
): Promise<NormalizedEvent | { ignored: string }> {
  if (COUNTRY === "CO") {
    if (!co.verifyWebhookSignature(payload as never)) {
      throw new Error("Firma invalida");
    }
    const event = payload as {
      event?: string;
      data?: { transaction?: { id?: string; reference?: string; status?: string } };
    };
    if (event.event !== "transaction.updated") {
      return { ignored: String(event.event) };
    }
    const tx = event.data?.transaction;
    const confirmed = tx?.id ? await co.getTransaction(tx.id) : null;
    const raw = String(confirmed?.status ?? tx?.status ?? "").toUpperCase();
    return {
      reference: tx?.reference ?? null,
      transactionId: tx?.id ?? null,
      status:
        raw === "APPROVED"
          ? "approved"
          : ["DECLINED", "VOIDED", "ERROR"].includes(raw)
            ? "declined"
            : "pending",
    };
  }

  // --- Wompi SV ---
  // No hay firma documentada, asi que la URL lleva un token secreto y ademas
  // el estado se confirma contra GET /TransaccionCompra/{id}.
  const expected = process.env.WOMPI_WEBHOOK_TOKEN;
  if (expected && searchParams.get("token") !== expected) {
    throw new Error("Token de webhook invalido");
  }

  const str = (value: unknown): string | null =>
    typeof value === "string" && value ? value : null;

  const transactionId =
    str(payload.idTransaccion) ?? str(payload.IdTransaccion);

  let reference: string | null =
    str(payload.identificadorEnlaceComercio) ??
    str(payload.IdentificadorEnlaceComercio);

  const confirmed = transactionId ? await sv.getTransaction(transactionId) : null;

  if (!reference) {
    reference = confirmed?.identificadorEnlaceComercio ?? null;
  }
  if (!reference) {
    const idEnlace = (payload.idEnlace ?? confirmed?.idEnlace) as
      | number
      | string
      | undefined;
    if (idEnlace !== undefined) {
      const link = await sv.getPaymentLink(idEnlace);
      reference = link?.identificadorEnlaceComercio ?? null;
    }
  }

  const approved = confirmed
    ? confirmed.esAprobada === true
    : payload.esAprobada === true;

  // `esReal === false` es una transaccion de prueba: se acepta solo fuera de produccion.
  const isReal = confirmed?.esReal ?? (payload.esReal as boolean | undefined);
  const allowTest = process.env.WOMPI_ALLOW_TEST_TRANSACTIONS === "true";
  const usable = isReal !== false || allowTest;

  return {
    reference,
    transactionId,
    status: approved && usable ? "approved" : approved ? "pending" : "declined",
  };
}

export { sv, co };
