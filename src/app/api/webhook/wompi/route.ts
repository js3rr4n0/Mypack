import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db, spots, bids } from "@/db";
import { resolveEvent } from "@/lib/wompi";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhook/wompi
 *
 * Wompi notifica al urlWebhook del enlace de pago. Como el evento no viene
 * firmado, la URL lleva un token secreto y el estado se reconfirma contra
 * GET /TransaccionCompra/{id}. La zona solo cambia de dueno con el pago aprobado.
 */
export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  let resolved;
  try {
    resolved = await resolveEvent(payload, new URL(req.url).searchParams);
  } catch (error) {
    console.warn("[wompi] evento rechazado:", error);
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { reference, transactionId, status } = resolved;
  if (!reference) {
    return NextResponse.json({ error: "Sin referencia" }, { status: 400 });
  }

  const [bid] = await db
    .select()
    .from(bids)
    .where(eq(bids.wompiReference, reference))
    .limit(1);

  if (!bid) return NextResponse.json({ ok: true, unknownReference: reference });
  if (bid.status !== "pending") {
    return NextResponse.json({ ok: true, alreadyProcessed: bid.status });
  }

  if (status !== "approved") {
    await db
      .update(bids)
      .set({ status, wompiTransactionId: transactionId ?? bid.wompiTransactionId })
      .where(eq(bids.id, bid.id));
    return NextResponse.json({ ok: true, status });
  }

  const [spot] = await db.select().from(spots).where(eq(spots.id, bid.spotId)).limit(1);
  if (!spot) return NextResponse.json({ ok: true, missingSpot: bid.spotId });

  // El precio nuevo es el que la puja buscaba alcanzar, no necesariamente lo que
  // se cobro (una marca que regresa paga solo la diferencia).
  const newPrice = Math.max(
    (bid.previousPrice ?? 0) + bid.amount,
    spot.currentPrice + 1,
    spot.minBid
  );

  await db
    .update(bids)
    .set({ isOutbid: true })
    .where(
      and(eq(bids.spotId, spot.id), eq(bids.status, "approved"), ne(bids.id, bid.id))
    );

  await db
    .update(bids)
    .set({
      status: "approved",
      wompiTransactionId: transactionId ?? bid.wompiTransactionId,
      isOutbid: false,
    })
    .where(eq(bids.id, bid.id));

  await db
    .update(spots)
    .set({ currentBrandId: bid.brandId, currentPrice: newPrice })
    .where(eq(spots.id, spot.id));

  return NextResponse.json({ ok: true, status, spot: spot.name, newPrice });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "wompi webhook" });
}
