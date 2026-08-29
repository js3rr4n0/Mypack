import crypto from "crypto";
import { centsToDecimal } from "../money";

/**
 * Cliente Wompi El Salvador (https://docs.wompi.sv).
 *
 * Autenticacion: OAuth 2.0 client_credentials contra https://id.wompi.sv/connect/token
 * usando el App ID (client_id) y el API Secret (client_secret) del panel de Wompi.
 * El token dura una hora y se cachea en memoria.
 *
 * Cobro: se crea un Enlace de Pago (POST /EnlacePago) y se redirige al comprador
 * a `urlEnlace`. Wompi notifica el resultado al `urlWebhook` del enlace.
 */

export const TOKEN_URL =
  process.env.WOMPI_TOKEN_URL ?? "https://id.wompi.sv/connect/token";
export const API_URL = process.env.WOMPI_API_URL ?? "https://api.wompi.sv";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Token de acceso, reutilizado hasta 60s antes de expirar. */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    audience: "wompi_api",
    client_id: requireEnv("WOMPI_APP_ID"),
    client_secret: requireEnv("WOMPI_API_SECRET"),
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Wompi token ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + Math.max(json.expires_in - 60, 30) * 1000,
  };
  return cachedToken.value;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`Wompi ${path} ${res.status}: ${text.slice(0, 400)}`);
  }
  return json as T;
}

export function newReference(spotName: string): string {
  return `mypack-${spotName}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}`;
}

/** Token secreto que viaja en la URL del webhook (Wompi no firma sus eventos). */
export function webhookUrl(origin: string): string {
  const secret = process.env.WOMPI_WEBHOOK_TOKEN;
  return `${origin}/api/webhook/wompi${
    secret ? `?token=${encodeURIComponent(secret)}` : ""
  }`;
}

export interface PaymentLink {
  idEnlace: number;
  urlEnlace: string;
  urlQrCodeEnlace?: string;
  estaProductivo?: boolean;
}

export interface CheckoutInput {
  reference: string;
  amountInCents: number;
  customerEmail: string;
  productName: string;
  description?: string;
  origin: string;
}

/**
 * POST /EnlacePago — crea el cobro de una puja y devuelve la URL a la que hay
 * que redirigir al comprador.
 */
export async function startCheckout(
  input: CheckoutInput
): Promise<{ url: string; providerId: string }> {
  const redirectUrl = `${input.origin}/thanks?ref=${encodeURIComponent(
    input.reference
  )}`;

  const link = await api<PaymentLink>("/EnlacePago", {
    method: "POST",
    body: JSON.stringify({
      identificadorEnlaceComercio: input.reference,
      monto: centsToDecimal(input.amountInCents),
      nombreProducto: input.productName,
      formaPago: {
        permitirTarjetaCreditoDebido: true,
        permitirPagoConPuntoAgricola: false,
        permitirPagoEnCuotasAgricola: false,
        permitirPagoEnBitcoin: false,
        permitePagoQuickPay: true,
      },
      infoProducto: input.description
        ? { descripcionProducto: input.description }
        : undefined,
      configuracion: {
        urlRedirect: redirectUrl,
        urlRetorno: redirectUrl,
        urlWebhook: webhookUrl(input.origin),
        esMontoEditable: false,
        esCantidadEditable: false,
        cantidadPorDefecto: 1,
        notificarTransaccionCliente: true,
        emailsNotificacion: input.customerEmail,
      },
      limitesDeUso: { cantidadMaximaPagosExitosos: 1 },
    }),
  });

  return { url: link.urlEnlace, providerId: String(link.idEnlace) };
}

export interface WompiTransaction {
  idTransaccion: string;
  idExterno?: string;
  esAprobada: boolean;
  esReal: boolean;
  monto: number;
  mensaje?: string;
  resultadoTransaccion?: number | null;
  identificadorEnlaceComercio?: string;
  idEnlace?: number;
}

/** GET /TransaccionCompra/{id} — fuente de verdad del estado de un pago. */
export async function getTransaction(
  id: string
): Promise<WompiTransaction | null> {
  try {
    return await api<WompiTransaction>(
      `/TransaccionCompra/${encodeURIComponent(id)}`
    );
  } catch (error) {
    console.error("[wompi] no se pudo consultar la transaccion", error);
    return null;
  }
}

/** GET /EnlacePago/{id} — para recuperar la referencia del comercio. */
async function getPaymentLink(
  idEnlace: number | string
): Promise<{ identificadorEnlaceComercio?: string } | null> {
  try {
    return await api(`/EnlacePago/${encodeURIComponent(String(idEnlace))}`);
  } catch {
    return null;
  }
}

/**
 * GET /TransaccionCompra — busca la transaccion de una referencia sin depender
 * del webhook. Wompi copia `identificadorEnlaceComercio` en el `idExterno` de
 * la transaccion, asi que se filtra por email y fecha y se compara ese campo.
 */
export async function findTransactionByReference(
  reference: string,
  customerEmail: string,
  since: Date
): Promise<WompiTransaction | null> {
  const params = new URLSearchParams({
    emailCliente: customerEmail,
    fechaInicio: since.toISOString().slice(0, 10),
    fechaFin: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    cantidadPorPagina: "50",
  });

  try {
    const page = await api<{ resultado?: WompiTransaction[] }>(
      `/TransaccionCompra?${params.toString()}`
    );
    const rows = page?.resultado ?? [];
    return (
      rows.find(
        (t) =>
          t.idExterno === reference ||
          t.identificadorEnlaceComercio === reference
      ) ?? null
    );
  } catch (error) {
    console.error("[wompi] no se pudo buscar la transaccion", error);
    return null;
  }
}

export type PaymentStatus = "approved" | "declined" | "pending";

export interface NormalizedEvent {
  reference: string | null;
  transactionId: string | null;
  status: PaymentStatus;
}

/**
 * Normaliza la notificacion entrante. Wompi no firma sus webhooks, asi que:
 *  1. La URL registrada lleva un token secreto, que el route valida.
 *  2. El estado se reconfirma contra GET /TransaccionCompra/{id} en vez de
 *     confiar en el cuerpo del evento.
 */
export async function resolveEvent(
  payload: Record<string, unknown>,
  searchParams: URLSearchParams
): Promise<NormalizedEvent> {
  const expected = process.env.WOMPI_WEBHOOK_TOKEN;
  if (!expected) {
    // Sin token el endpoint queda abierto: cualquiera podria reclamar una zona.
    // Se tolera solo en desarrollo.
    if (process.env.NODE_ENV === "production") {
      throw new Error("WOMPI_WEBHOOK_TOKEN no esta configurado");
    }
    console.warn("[wompi] webhook sin token: solo aceptable en desarrollo");
  } else if (searchParams.get("token") !== expected) {
    throw new Error("Token de webhook invalido");
  }

  const str = (value: unknown): string | null =>
    typeof value === "string" && value ? value : null;

  const transactionId = str(payload.idTransaccion) ?? str(payload.IdTransaccion);

  let reference: string | null =
    str(payload.identificadorEnlaceComercio) ??
    str(payload.IdentificadorEnlaceComercio);

  const confirmed = transactionId ? await getTransaction(transactionId) : null;

  if (!reference) reference = confirmed?.identificadorEnlaceComercio ?? null;

  if (!reference) {
    const idEnlace = (payload.idEnlace ?? confirmed?.idEnlace) as
      | number
      | string
      | undefined;
    if (idEnlace !== undefined) {
      const link = await getPaymentLink(idEnlace);
      reference = link?.identificadorEnlaceComercio ?? null;
    }
  }

  const approved = confirmed
    ? confirmed.esAprobada === true
    : payload.esAprobada === true;

  // `esReal === false` es una transaccion de prueba: solo se acepta si se pidio.
  const isReal = confirmed?.esReal ?? (payload.esReal as boolean | undefined);
  const allowTest = process.env.WOMPI_ALLOW_TEST_TRANSACTIONS === "true";
  const usable = isReal !== false || allowTest;

  return {
    reference,
    transactionId,
    status: approved && usable ? "approved" : approved ? "pending" : "declined",
  };
}
