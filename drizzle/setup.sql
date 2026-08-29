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
  ('top_flap', 'Solapa Superior', 'Lo primero que ve quien va detrás de mí en la fila del café. Visibilidad máxima.', 1, 5000),
  ('main_front', 'Panel Frontal', 'El billboard. El panel más grande y el que más tiempo pasa a la altura de los ojos.', 2, 7500),
  ('front_pocket', 'Bolsillo Frontal', 'Justo bajo el panel principal, sobre el sistema MOLLE.', 3, 3000),
  ('left_side', 'Lateral Izquierdo', 'Se ve todo el tiempo en el microbús, la fila del banco y el ascensor.', 4, 2000),
  ('right_side', 'Lateral Derecho', 'El lado del bolsillo de botella. Visible al caminar por la calle.', 5, 2000),
  ('top_handle', 'Zona del Asa', 'Pequeña, pero sale en cada foto y cada vez que levanto la mochila.', 6, 1200)
ON CONFLICT ("name") DO UPDATE SET
  "display_name" = EXCLUDED."display_name",
  "description" = EXCLUDED."description",
  "position_order" = EXCLUDED."position_order",
  "min_bid" = EXCLUDED."min_bid";

-- Comprobacion final: deberia devolver 6 filas.
SELECT "position_order", "name", "display_name", "min_bid", "current_price"
FROM "spots"
ORDER BY "position_order";
