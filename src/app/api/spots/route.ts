import { NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, spots, brands, bids } from "@/db";
import { SPOTS, nextBidAmount } from "@/lib/spots";

export const dynamic = "force-dynamic";

/** GET /api/spots — estado actual de las 6 zonas. */
export async function GET() {
  try {
    const rows = await db
      .select({
        id: spots.id,
        name: spots.name,
        displayName: spots.displayName,
        description: spots.description,
        positionOrder: spots.positionOrder,
        minBid: spots.minBid,
        currentPrice: spots.currentPrice,
        isActive: spots.isActive,
        brandId: brands.id,
        brandName: brands.name,
        brandLogoUrl: brands.logoUrl,
        brandLogoBase64: brands.logoBase64,
        brandWebsite: brands.website,
        brandTwitter: brands.twitter,
        brandInstagram: brands.instagram,
      })
      .from(spots)
      .leftJoin(brands, eq(spots.currentBrandId, brands.id))
      .where(eq(spots.isActive, true))
      .orderBy(asc(spots.positionOrder));

    if (rows.length === 0) throw new Error("empty");

    // Ultimas zonas reclamadas de verdad. Si no hay ninguna, el sitio no
    // muestra nada: inventar actividad para dar sensacion de movimiento seria
    // mentirle a quien esta a punto de pagar.
    const recent = await db
      .select({
        spot: spots.displayName,
        brand: brands.name,
        amount: bids.bidPrice,
        at: bids.createdAt,
      })
      .from(bids)
      .innerJoin(spots, eq(bids.spotId, spots.id))
      .innerJoin(brands, eq(bids.brandId, brands.id))
      .where(and(eq(bids.status, "approved"), eq(bids.needsRefund, false)))
      .orderBy(desc(bids.createdAt))
      .limit(5);

    return NextResponse.json({
      recent,
      spots: rows.map((r) => ({
        ...r,
        nextBid: nextBidAmount(r.currentPrice, r.minBid),
        brand: r.brandId
          ? {
              id: r.brandId,
              name: r.brandName,
              logo: r.brandLogoUrl || r.brandLogoBase64,
              website: r.brandWebsite,
              twitter: r.brandTwitter,
              instagram: r.brandInstagram,
            }
          : null,
      })),
    });
  } catch {
    // Sin base de datos configurada la landing sigue siendo navegable.
    return NextResponse.json({
      degraded: true,
      recent: [],
      spots: SPOTS.map((s, i) => ({
        id: i + 1,
        name: s.name,
        displayName: s.displayName,
        description: s.description,
        positionOrder: s.positionOrder,
        minBid: s.minBid,
        currentPrice: 0,
        isActive: true,
        nextBid: s.minBid,
        brand: null,
      })),
    });
  }
}
