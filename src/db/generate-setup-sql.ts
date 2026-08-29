/**
 * Genera drizzle/setup.sql: el esquema completo mas las 6 zonas sembradas,
 * en un solo archivo idempotente que se puede pegar en el SQL Editor de Neon.
 *
 *   npm run db:sql
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SPOTS, RETIRED_SPOTS } from "../lib/spots";

const drizzleDir = join(process.cwd(), "drizzle");

const migration = readdirSync(drizzleDir)
  .filter((f) => f.endsWith(".sql") && f !== "setup.sql")
  .sort()
  .map((f) => readFileSync(join(drizzleDir, f), "utf8"))
  .join("\n")
  .replaceAll("--> statement-breakpoint", "")
  // drizzle-kit emite ALTER TABLE ... ADD COLUMN sin guarda, que revienta en la
  // segunda corrida. setup.sql tiene que poder pegarse las veces que haga falta.
  .replace(/ADD COLUMN "/g, 'ADD COLUMN IF NOT EXISTS "');

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;

const rows = SPOTS.map(
  (s) =>
    `  (${quote(s.name)}, ${quote(s.displayName)}, ${quote(s.description)}, ${
      s.positionOrder
    }, ${s.minBid})`
).join(",\n");

const sql = `-- mypack.lol — esquema + zonas iniciales.
-- Pegar completo en el SQL Editor de Neon. Se puede correr varias veces sin romper nada.
-- Generado por: npm run db:sql

${migration.trim()}

-- Las 6 zonas de la mochila. min_bid va en centavos de USD.
INSERT INTO "spots" ("name", "display_name", "description", "position_order", "min_bid")
VALUES
${rows}
ON CONFLICT ("name") DO UPDATE SET
  "display_name" = EXCLUDED."display_name",
  "description" = EXCLUDED."description",
  "position_order" = EXCLUDED."position_order",
  "min_bid" = EXCLUDED."min_bid";

-- Zonas retiradas: se desactivan en vez de borrarse, porque pueden tener pujas
-- historicas apuntando a ellas y la llave foranea lo impediria.
UPDATE "spots" SET "is_active" = false
WHERE "name" IN (${RETIRED_SPOTS.map(quote).join(", ")});

-- Comprobacion final: deberia devolver ${SPOTS.length} filas activas.
SELECT "position_order", "name", "display_name", "min_bid", "current_price"
FROM "spots"
WHERE "is_active"
ORDER BY "position_order";
`;

writeFileSync(join(drizzleDir, "setup.sql"), sql);
console.log(`drizzle/setup.sql generado: ${SPOTS.length} zonas activas, ${RETIRED_SPOTS.length} retiradas.`);
