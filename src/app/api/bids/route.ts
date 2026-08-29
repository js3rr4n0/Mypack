import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, spots, brands, bids } from "@/db";
import { nextBidAmount, formatMoney } from "@/lib/spots";
import { newReference, startCheckout } from "@/lib/wompi";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function handle(value: unknown): string | null {
  const raw = clean(value, 100);
  return raw ? raw.replace(/^@+/, "").replace(/^https?:\/\/\S+\//, "") : null;
}

/**
 * POST /api/bids
 * Registra la puja en estado "pending" y devuelve la URL de pago de Wompi.
 * La zona SOLO cambia de dueno cuando el webhook confirma APPROVED.
 */
export async function POST(req: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const spotName = clean(payload.spot, 50);
  const brandName = clean(payload.brandName, 100);
  const email = clean(payload.email, 255);
  const logoUrl = clean(payload.logoUrl, 2000);
  const logoBase64 = typeof payload.logoBase64 === "string" ? payload.logoBase64 : null;

  if (!spotName) return NextResponse.json({ error: "Falta la zona" }, { status: 400 });
  if (!brandName)
    return NextResponse.json({ error: "El nombre de la marca es obligatorio" }, { status: 400 });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Email invalido" }, { status: 400 });
  if (!logoUrl && !logoBase64)
    return NextResponse.json({ error: "Sube un logo o pega su URL" }, { status: 400 });
  if (logoBase64 && logoBase64.length > MAX_LOGO_BYTES * 1.4)
    return NextResponse.json({ error: "El logo supera los 5MB" }, { status: 413 });

  try {
    const [spot] = await db.select().from(spots).where(eq(spots.name, spotName)).limit(1);
    if (!spot || !spot.isActive)
      return NextResponse.json({ error: "Zona no disponible" }, { status: 404 });

    const target = nextBidAmount(spot.currentPrice, spot.minBid);

    // Marca: se reutiliza por email + nombre, y se actualiza el logo.
    const [existingBrand] = await db
      .select()
      .from(brands)
      .where(and(eq(brands.email, email), eq(brands.name, brandName)))
      .limit(1);

    const brandValues = {
      name: brandName,
      logoUrl,
      logoBase64,
      website: clean(payload.website, 255),
      twitter: handle(payload.twitter),
      instagram: handle(payload.instagram),
      email,
    };

    const brand = existingBrand
      ? (
          await db
            .update(brands)
            .set(brandValues)
            .where(eq(brands.id, existingBrand.id))
            .returning()
        )[0]
      : (await db.insert(brands).values(brandValues).returning())[0];

    // Si esta marca ya habia ocupado esta zona y la sacaron, solo paga la diferencia.
    let credit = 0;
    if (existingBrand) {
      const [previous] = await db
        .select()
        .from(bids)
        .where(
          and(
            eq(bids.spotId, spot.id),
            eq(bids.brandId, brand.id),
            eq(bids.status, "approved"),
            eq(bids.isOutbid, true)
          )
        )
        .orderBy(desc(bids.createdAt))
        .limit(1);
      if (previous) credit = Math.min(previous.amount, target - 1);
    }

    const amount = Math.max(target - credit, 100);
    const reference = newReference(spot.name);

    await db.insert(bids).values({
      spotId: spot.id,
      brandId: brand.id,
      amount,
      previousPrice: spot.currentPrice,
      wompiReference: reference,
      status: "pending",
    });

    const origin = siteUrl();

    const checkout = await startCheckout({
      reference,
      amountInCents: amount,
      customerEmail: email,
      productName: `mypack.lol — ${spot.displayName}`,
      description: `Logo de ${brandName} en la zona "${spot.displayName}" de la mochila.`,
      origin,
    });

    if (checkout.providerId) {
      await db
        .update(bids)
        .set({ wompiTransactionId: checkout.providerId })
        .where(eq(bids.wompiReference, reference));
    }

    return NextResponse.json({
      reference,
      amount,
      credit,
      newPrice: target,
      amountLabel: formatMoney(amount),
      checkoutUrl: checkout.url,
    });
  } catch (error) {
    console.error("[bids] ", error);
    return NextResponse.json(
      { error: "No se pudo iniciar el pago. Revisa la configuracion del servidor." },
      { status: 500 }
    );
  }
}
