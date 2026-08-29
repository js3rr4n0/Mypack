import { NextResponse } from "next/server";
import { db, webhookEvents } from "@/db";
import { resolveEvent } from "@/lib/wompi";
import { settleBid } from "@/lib/settle";

export const dynamic = "force-dynamic";

/** Deja rastro de la llamada aunque despues se rechace. */
async function log(body: string, outcome: string, reference?: string | null) {
  try {
    await db.insert(webhookEvents).values({
      body: body.slice(0, 8000),
      outcome,
      reference: reference ?? null,
    });
  } catch (error) {
    console.error("[webhook] no se pudo registrar el evento", error);
  }
}

/**
 * POST /api/webhook/wompi
 *
 * Wompi notifica al urlWebhook del enlace de pago. Como el evento no viene
 * firmado, la URL lleva un token secreto y el estado se reconfirma contra la
 * API. La zona solo cambia de dueno con el pago aprobado.
 *
 * Todo lo que entra queda registrado en `webhook_events`, incluido lo que se
 * rechaza: sin ese rastro es imposible saber si Wompi llamo siquiera.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    await log(raw, "json_invalido");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let resolved;
  try {
    resolved = await resolveEvent(payload!, new URL(req.url).searchParams);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "rechazado";
    await log(raw, `rechazado: ${reason}`);
    console.warn("[wompi] evento rechazado:", reason);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reference, transactionId, status } = resolved;
  if (!reference) {
    await log(raw, "sin_referencia");
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const result = await settleBid(reference, status, transactionId, "webhook");
  await log(raw, result.outcome, reference);

  return NextResponse.json({ ok: true, ...result });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "wompi webhook" });
}
