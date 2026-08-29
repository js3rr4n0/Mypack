import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, bids, spots } from "@/db";

export const dynamic = "force-dynamic";

/** GET /api/bids/status?ref=... — usado por la pagina /thanks. */
export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref");
  if (!ref) return NextResponse.json({ error: "Missing ref" }, { status: 400 });

  try {
    const [row] = await db
      .select({
        status: bids.status,
        amount: bids.amount,
        spot: spots.displayName,
      })
      .from(bids)
      .leftJoin(spots, eq(bids.spotId, spots.id))
      .where(eq(bids.wompiReference, ref))
      .limit(1);

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
