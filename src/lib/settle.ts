import { and, eq, ne } from "drizzle-orm";
import { db, spots, bids } from "@/db";
import { findTransactionByReference, type PaymentStatus } from "@/lib/wompi";

/**
 * Liquidacion de una puja: la unica pieza que puede cambiar el dueno de una
 * zona. La usan tanto el webhook como la reconciliacion, para que no existan
 * dos caminos con reglas distintas.
 */
export interface SettleResult {
  outcome:
    | "approved"
    | "declined"
    | "pending"
    | "already_processed"
    | "unknown_reference"
    | "outbid_needs_refund";
  spot?: string;
  newPrice?: number;
}

export async function settleBid(
  reference: string,
  status: PaymentStatus,
  transactionId: string | null,
  via: "webhook" | "reconcile"
): Promise<SettleResult> {
  const [bid] = await db
    .select()
    .from(bids)
    .where(eq(bids.wompiReference, reference))
    .limit(1);

  if (!bid) return { outcome: "unknown_reference" };
  if (bid.status !== "pending") {
    return { outcome: "already_processed" };
  }

  if (status !== "approved") {
    await db
      .update(bids)
      .set({
        status,
        wompiTransactionId: transactionId ?? bid.wompiTransactionId,
        settledVia: status === "declined" ? via : null,
      })
      .where(eq(bids.id, bid.id));
    return { outcome: status };
  }

  const [spot] = await db.select().from(spots).where(eq(spots.id, bid.spotId)).limit(1);
  if (!spot) return { outcome: "unknown_reference" };

  // El precio que esta puja buscaba alcanzar. No es lo que se cobro: una marca
  // que regresa a una zona que ya ocupaba solo paga la diferencia.
  const targetPrice = (bid.previousPrice ?? 0) + bid.amount;

  // Carrera perdida: mientras esta persona pagaba, otra se llevo la zona por
  // igual o mas. Se cobro el dinero, asi que queda marcado para devolucion.
  if (targetPrice <= spot.currentPrice) {
    await db
      .update(bids)
      .set({
        status: "approved",
        isOutbid: true,
        needsRefund: true,
        wompiTransactionId: transactionId ?? bid.wompiTransactionId,
        settledVia: via,
      })
      .where(eq(bids.id, bid.id));
    console.error(
      `[settle] DEVOLUCION PENDIENTE ref=${reference}: pago ${bid.amount} por ${spot.name}, ` +
        `pero la zona ya estaba en ${spot.currentPrice}.`
    );
    return { outcome: "outbid_needs_refund", spot: spot.name };
  }

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
      isOutbid: false,
      wompiTransactionId: transactionId ?? bid.wompiTransactionId,
      settledVia: via,
    })
    .where(eq(bids.id, bid.id));

  await db
    .update(spots)
    .set({ currentBrandId: bid.brandId, currentPrice: targetPrice })
    .where(eq(spots.id, spot.id));

  return { outcome: "approved", spot: spot.name, newPrice: targetPrice };
}

/**
 * Confirma una puja pendiente preguntandole directamente a Wompi.
 *
 * El webhook puede no llegar nunca — se cae la red, cambia la URL, el proveedor
 * no reintenta. Sin esto, un pago cobrado se queda "pendiente" para siempre y
 * el cliente nunca ve su logo.
 */
export async function reconcileBid(reference: string): Promise<SettleResult> {
  const [row] = await db
    .select({
      bidId: bids.id,
      status: bids.status,
      createdAt: bids.createdAt,
    })
    .from(bids)
    .where(eq(bids.wompiReference, reference))
    .limit(1);

  if (!row) return { outcome: "unknown_reference" };
  if (row.status !== "pending") return { outcome: "already_processed" };

  const since = row.createdAt
    ? new Date(row.createdAt.getTime() - 86_400_000)
    : new Date(Date.now() - 7 * 86_400_000);

  const tx = await findTransactionByReference(reference, since);
  if (!tx) return { outcome: "pending" };

  const allowTest = process.env.WOMPI_ALLOW_TEST_TRANSACTIONS === "true";
  const usable = tx.esReal !== false || allowTest;
  const status: PaymentStatus = tx.esAprobada
    ? usable
      ? "approved"
      : "pending"
    : "declined";

  return settleBid(reference, status, tx.idTransaccion ?? null, "reconcile");
}
