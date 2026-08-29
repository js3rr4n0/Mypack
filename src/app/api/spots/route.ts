import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, spots, brands } from "@/db";
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

    return NextResponse.json({
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
