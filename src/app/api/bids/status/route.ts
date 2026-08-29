import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, bids, spots } from "@/db";
import { reconcileBid } from "@/lib/settle";

export const dynamic = "force-dynamic";

/**
 * GET /api/bids/status?ref=... — estado de una puja, usado por /thanks.
 *
 * Si sigue pendiente le pregunta directamente a Wompi y la liquida ahi mismo.
 * Asi un pago cobrado se publica aunque el webhook nunca llegue.
 */
export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref");
  if (!ref) return NextResponse.json({ error: "Missing ref" }, { status: 400 });

  try {
    const read = async () =>
      (
        await db
          .select({
            status: bids.status,
            amount: bids.amount,
            needsRefund: bids.needsRefund,
            spot: spots.displayName,
          })
          .from(bids)
          .leftJoin(spots, eq(bids.spotId, spots.id))
          .where(eq(bids.wompiReference, ref))
          .limit(1)
      )[0];

    let row = await read();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (row.status === "pending") {
      await reconcileBid(ref).catch((error) =>
        console.error("[status] reconciliacion fallida", error)
      );
      row = (await read()) ?? row;
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("[status]", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
