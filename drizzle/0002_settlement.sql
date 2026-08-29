CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"body" text,
	"outcome" varchar(40),
	"reference" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN "needs_refund" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN "settled_via" varchar(20);