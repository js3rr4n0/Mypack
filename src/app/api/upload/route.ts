import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"];

/**
 * POST /api/upload (multipart)
 * Sube el logo a Vercel Blob. Si no hay token configurado devuelve el logo
 * como data URL en base64 para que el flujo no se rompa.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Maximo 5MB" }, { status: 413 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Formato no soportado (PNG o SVG)" }, { status: 415 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`logos/${Date.now()}-${safeName}`, file, {
        access: "public",
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url, storage: "blob" });
    } catch (error) {
      console.error("[upload] blob fallo, usando base64", error);
    }
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return NextResponse.json({
    base64: `data:${file.type};base64,${base64}`,
    storage: "base64",
  });
}
