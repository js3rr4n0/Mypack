import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import { db, visits } from "@/db";

export const dynamic = "force-dynamic";

/** User-agents que no son personas: no deben contar como visitas. */
const BOT = /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|headless|lighthouse|monitor|curl|wget|python-requests|axios|postman/i;

function visitorHash(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.VISIT_SALT ?? "mypack";

  // La IP nunca se guarda: solo el hash, que ademas cambia cada dia.
  return crypto
    .createHash("sha256")
    .update(`${ip}|${ua}|${day}|${salt}`)
    .digest("hex");
}

async function total(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(visits);
  return row?.count ?? 0;
}

/** POST /api/visit — registra la visita del dia y devuelve el total. */
export async function POST(req: Request) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (!BOT.test(ua)) {
      await db
        .insert(visits)
        .values({ visitorHash: visitorHash(req) })
        .onConflictDoNothing();
    }
    return NextResponse.json({ total: await total() });
  } catch (error) {
    console.error("[visit]", error);
    // Sin base de datos no se inventa un numero: el contador simplemente no se muestra.
    return NextResponse.json({ total: null }, { status: 503 });
  }
}

/** GET /api/visit — solo lectura del total. */
export async function GET() {
  try {
    return NextResponse.json({ total: await total() });
  } catch {
    return NextResponse.json({ total: null }, { status: 503 });
  }
}
