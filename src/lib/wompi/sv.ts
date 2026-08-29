import { centsToDecimal } from "../money";

/**
 * Cliente Wompi El Salvador (https://docs.wompi.sv).
 *
 * Autenticacion: OAuth 2.0 client_credentials contra https://id.wompi.sv/connect/token
 * usando el App ID (client_id) y el API Secret (client_secret) del panel de Wompi.
 * El token dura 1 hora y se cachea en memoria.
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

export interface PaymentLink {
  idEnlace: number;
  urlEnlace: string;
  urlQrCodeEnlace?: string;
  estaProductivo?: boolean;
}

/** POST /EnlacePago — crea el enlace de pago para una puja. */
export async function createPaymentLink(input: {
  reference: string;
  amountInCents: number;
  productName: string;
  description?: string;
  redirectUrl: string;
  webhookUrl: string;
  notifyEmail?: string;
}): Promise<PaymentLink> {
  return api<PaymentLink>("/EnlacePago", {
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
        urlRedirect: input.redirectUrl,
        urlRetorno: input.redirectUrl,
        urlWebhook: input.webhookUrl,
        esMontoEditable: false,
        esCantidadEditable: false,
        cantidadPorDefecto: 1,
        notificarTransaccionCliente: true,
        emailsNotificacion: input.notifyEmail,
      },
      limitesDeUso: {
        cantidadMaximaPagosExitosos: 1,
      },
    }),
  });
}

export interface SvTransaction {
  idTransaccion: string;
  esAprobada: boolean;
  esReal: boolean;
  monto: number;
  mensaje?: string;
  resultadoTransaccion?: number | null;
  identificadorEnlaceComercio?: string;
  idEnlace?: number;
}

/** GET /TransaccionCompra/{id} — fuente de verdad del estado de una transaccion. */
export async function getTransaction(id: string): Promise<SvTransaction | null> {
  try {
    return await api<SvTransaction>(
      `/TransaccionCompra/${encodeURIComponent(id)}`
    );
  } catch (error) {
    console.error("[wompi.sv] no se pudo consultar la transaccion", error);
    return null;
  }
}

/** GET /EnlacePago/{id} — usado para recuperar la referencia del comercio. */
export async function getPaymentLink(
  idEnlace: number | string
): Promise<{ identificadorEnlaceComercio?: string } | null> {
  try {
    return await api(`/EnlacePago/${encodeURIComponent(String(idEnlace))}`);
  } catch {
    return null;
  }
}
