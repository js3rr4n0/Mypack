import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db, spots, bids } from "@/db";
import { verifyWebhookSignature, getTransaction } from "@/lib/wompi";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhook/wompi
 * Evento transaction.updated. La zona se actualiza unicamente con APPROVED.
 */
export async function POST(req: Request) {
  const event = await req.json().catch(() => null);
  if (!event) return NextResponse.json({ error: "JSON invalido" }, { status: 400 });

  if (!verifyWebhookSignature(event)) {
    console.warn("[wompi] firma invalida");
    return NextResponse.json({ error: "Firma invalida" }, { status: 401 });
  }

  if (event.event !== "transaction.updated") {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const tx = event?.data?.transaction;
  const reference: string | undefined = tx?.reference;
  if (!reference) return NextResponse.json({ error: "Sin referencia" }, { status: 400 });

  // La verdad la tiene la API, no el payload.
  const confirmed = tx?.id ? await getTransaction(tx.id) : null;
  const status: string = (confirmed?.status ?? tx?.status ?? "").toUpperCase();

  const [bid] = await db
    .select()
    .from(bids)
    .where(eq(bids.wompiReference, reference))
    .limit(1);

  if (!bid) return NextResponse.json({ ok: true, unknownReference: reference });
  if (bid.status !== "pending") {
    return NextResponse.json({ ok: true, alreadyProcessed: bid.status });
  }

  if (status !== "APPROVED") {
    await db
      .update(bids)
      .set({
        status: status === "DECLINED" || status === "ERROR" || status === "VOIDED"
          ? "declined"
          : "pending",
        wompiTransactionId: tx?.id ?? null,
      })
      .where(eq(bids.id, bid.id));
    return NextResponse.json({ ok: true, status });
  }

  const [spot] = await db.select().from(spots).where(eq(spots.id, bid.spotId)).limit(1);
  if (!spot) return NextResponse.json({ ok: true, missingSpot: bid.spotId });

  // El precio nuevo es el que la puja buscaba alcanzar, no lo que se cobro
  // (una marca que regresa paga solo la diferencia).
  const newPrice = Math.max(
    (bid.previousPrice ?? 0) + bid.amount,
    spot.currentPrice + 1,
    spot.minBid
  );

  await db.update(bids).set({ isOutbid: true }).where(
    and(eq(bids.spotId, spot.id), eq(bids.status, "approved"), ne(bids.id, bid.id))
  );

  await db
    .update(bids)
    .set({ status: "approved", wompiTransactionId: tx?.id ?? null, isOutbid: false })
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
