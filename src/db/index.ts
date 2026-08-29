import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

let cached: DB | null = null;

function getDb(): DB {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no esta configurada");
  cached = drizzle(neon(url), { schema });
  return cached;
}

/**
 * Cliente perezoso: la conexion se crea en la primera consulta, no al importar,
 * para que el build no exija DATABASE_URL.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});

export * from "./schema";
