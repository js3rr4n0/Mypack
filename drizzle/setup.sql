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

-- Las 6 zonas de la mochila. min_bid va en centavos de USD.
INSERT INTO "spots" ("name", "display_name", "description", "position_order", "min_bid")
VALUES
  ('main_front', 'Front Panel', 'The billboard. The biggest panel, and the one that spends the most time at eye level.', 1, 7500),
  ('front_pocket', 'Front Pocket', 'Right below the main panel, on the MOLLE webbing.', 2, 3000),
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
