-- mypack.lol — esquema + zonas iniciales.
-- Pegar completo en el SQL Editor de Neon. Se puede correr varias veces sin romper nada.
-- Generado por: npm run db:sql

CREATE TABLE IF NOT EXISTS "bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"spot_id" integer NOT NULL,
	"brand_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"previous_price" integer,
	"is_outbid" boolean DEFAULT false,
	"wompi_transaction_id" varchar(100),
	"wompi_reference" varchar(100),
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "bids_wompi_reference_unique" UNIQUE("wompi_reference")
);

CREATE TABLE IF NOT EXISTS "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"logo_url" text,
	"logo_base64" text,
	"website" varchar(255),
	"twitter" varchar(100),
	"instagram" varchar(100),
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "spots" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"position_order" integer NOT NULL,
	"min_bid" integer DEFAULT 50000 NOT NULL,
	"current_price" integer DEFAULT 0 NOT NULL,
	"current_brand_id" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "spots_name_unique" UNIQUE("name")
);

DO $$ BEGIN
 ALTER TABLE "bids" ADD CONSTRAINT "bids_spot_id_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."spots"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "bids" ADD CONSTRAINT "bids_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "spots" ADD CONSTRAINT "spots_current_brand_id_brands_id_fk" FOREIGN KEY ("current_brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitor_hash" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "visits_visitor_hash_unique" UNIQUE("visitor_hash")
);

CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"body" text,
	"outcome" varchar(40),
	"reference" varchar(100),
	"created_at" timestamp DEFAULT now()
);

ALTER TABLE "bids" ADD COLUMN IF NOT EXISTS "needs_refund" boolean DEFAULT false;
ALTER TABLE "bids" ADD COLUMN IF NOT EXISTS "settled_via" varchar(20);
ALTER TABLE "bids" ADD COLUMN IF NOT EXISTS "wompi_link_id" varchar(50);
-- Liquidación manual de una puja ya pagada.
--
-- Úsalo solo si tienes el correo de Wompi confirmando el cobro y la página
-- /thanks?ref=… no logró cerrarla sola. Compatible con el SQL Editor de Neon.
--
-- Reemplaza los DOS valores de abajo por los tuyos antes de correrlo.

-- 1. Ver qué hay ahora (no cambia nada).
SELECT b.id, b.status, b.amount, b.previous_price, b.wompi_link_id,
       s.name AS spot, s.current_price, br.name AS brand,
       (br.logo_url IS NOT NULL OR br.logo_base64 IS NOT NULL) AS tiene_logo
FROM bids b
JOIN spots s   ON s.id  = b.spot_id
JOIN brands br ON br.id = b.brand_id
WHERE b.wompi_reference = 'PON-AQUI-TU-REFERENCIA';

-- 2. Liquidar: supera las pujas anteriores de esa zona, aprueba esta,
--    y le entrega la zona a la marca.
WITH target AS (
  SELECT id, spot_id, brand_id,
         (COALESCE(previous_price, 0) + amount) AS new_price
  FROM bids
  WHERE wompi_reference = 'PON-AQUI-TU-REFERENCIA' AND status = 'pending'
),
outbid AS (
  UPDATE bids SET is_outbid = true
  WHERE spot_id = (SELECT spot_id FROM target)
    AND status  = 'approved'
    AND id     <> (SELECT id FROM target)
  RETURNING 1
),
approve AS (
  UPDATE bids
  SET status = 'approved',
      is_outbid = false,
      settled_via = 'manual',
      wompi_transaction_id = 'PON-AQUI-EL-ID-DE-TRANSACCION'
  WHERE id = (SELECT id FROM target)
  RETURNING 1
)
UPDATE spots s
SET current_brand_id = (SELECT brand_id  FROM target),
    current_price    = (SELECT new_price FROM target)
WHERE s.id = (SELECT spot_id FROM target);

-- 3. Comprobar que quedó publicada.
SELECT s.display_name, br.name AS brand, (s.current_price/100.0)::money AS precio,
       b.status, b.settled_via
FROM spots s
JOIN brands br ON br.id = s.current_brand_id
JOIN bids b    ON b.spot_id = s.id
WHERE b.wompi_reference = 'PON-AQUI-TU-REFERENCIA';

-- Revisión del estado de mypack.lol. Solo lee, no cambia nada.
-- Compatible con el SQL Editor de Neon: pégalo completo y dale Run.
-- Devuelve seis tablas, una por bloque.

-- 1. ZONAS: quién ocupa qué y si tiene logo cargado.
SELECT '1. ZONAS' AS bloque,
       s.position_order AS n,
       s.display_name,
       COALESCE(br.name, '-- libre --')      AS marca,
       (s.current_price / 100.0)::money      AS precio_actual,
       (s.min_bid / 100.0)::money            AS precio_base,
       CASE
         WHEN br.id IS NULL              THEN ''
         WHEN br.logo_url    IS NOT NULL THEN 'logo por URL'
         WHEN br.logo_base64 IS NOT NULL THEN 'logo en base64'
         ELSE 'SIN LOGO (revisar)'
       END AS logo
FROM spots s
LEFT JOIN brands br ON br.id = s.current_brand_id
WHERE s.is_active
ORDER BY s.position_order;

-- 2. PAGOS: los últimos 10 y cómo se cerró cada uno.
SELECT '2. PAGOS' AS bloque,
       b.created_at::timestamp(0)   AS fecha,
       s.name                       AS zona,
       br.name                      AS marca,
       (b.amount / 100.0)::money    AS pagado,
       b.status,
       COALESCE(b.settled_via, '-') AS cerrado_por,
       b.needs_refund               AS devolver,
       b.wompi_reference
FROM bids b
JOIN spots s   ON s.id  = b.spot_id
JOIN brands br ON br.id = b.brand_id
ORDER BY b.id DESC
LIMIT 10;

-- 3. PENDIENTES de más de 30 minutos. Debería salir vacío.
SELECT '3. PENDIENTES' AS bloque,
       b.wompi_reference,
       br.email,
       (b.amount / 100.0)::money  AS monto,
       b.created_at::timestamp(0) AS desde
FROM bids b
JOIN brands br ON br.id = b.brand_id
WHERE b.status = 'pending'
  AND b.created_at < now() - interval '30 minutes';

-- 4. DEVOLUCIONES pendientes. Debería salir vacío.
SELECT '4. DEVOLUCIONES' AS bloque,
       b.wompi_reference,
       b.wompi_transaction_id,
       (b.amount / 100.0)::money AS monto,
       br.email,
       br.name
FROM bids b
JOIN brands br ON br.id = b.brand_id
WHERE b.needs_refund;

-- 5. WEBHOOK: ¿Wompi ha llamado alguna vez?
SELECT '5. WEBHOOK' AS bloque,
       created_at::timestamp(0) AS fecha,
       outcome,
       reference
FROM webhook_events
ORDER BY id DESC
LIMIT 5;

-- 6. VISITAS al sitio.
SELECT '6. VISITAS' AS bloque, count(*) AS total FROM visits;

-- Las 6 zonas de la mochila. min_bid va en centavos de USD.
INSERT INTO "spots" ("name", "display_name", "description", "position_order", "min_bid")
VALUES
  ('main_front', 'Front Panel', 'The billboard. The biggest panel, and the one that spends the most time at eye level.', 1, 7500),
  ('front_pocket', 'Front Pocket', 'Right below the main panel, dead center of the front.', 2, 3000),
  ('left_top', 'Left Side · Top', 'Shoulder height. The first thing you see walking past me.', 3, 2500),
  ('left_mid', 'Left Side · Middle', 'Dead center of the flank. On show all day in the bus and the elevator.', 4, 2000),
  ('left_bottom', 'Left Side · Bottom', 'On the MOLLE, next to the bottle pocket.', 5, 100),
  ('right_top', 'Right Side · Top', 'Shoulder height, on the street side.', 6, 2500),
  ('right_mid', 'Right Side · Middle', 'Center of the right flank. In full view on the sidewalk.', 7, 2000),
  ('right_bottom', 'Right Side · Bottom', 'On the MOLLE, bottle-pocket side.', 8, 1800)
ON CONFLICT ("name") DO UPDATE SET
  "display_name" = EXCLUDED."display_name",
  "description" = EXCLUDED."description",
  "position_order" = EXCLUDED."position_order",
  "min_bid" = EXCLUDED."min_bid";

-- Zonas retiradas: se desactivan en vez de borrarse, porque pueden tener pujas
-- historicas apuntando a ellas y la llave foranea lo impediria.
UPDATE "spots" SET "is_active" = false
WHERE "name" IN ('top_flap', 'top_handle', 'left_side', 'right_side');

-- Comprobacion final: deberia devolver 8 filas activas.
SELECT "position_order", "name", "display_name", "min_bid", "current_price"
FROM "spots"
WHERE "is_active"
ORDER BY "position_order";
