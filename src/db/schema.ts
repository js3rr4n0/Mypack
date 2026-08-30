import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  logoUrl: text("logo_url"),
  logoBase64: text("logo_base64"),
  website: varchar("website", { length: 255 }),
  twitter: varchar("twitter", { length: 100 }),
  instagram: varchar("instagram", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const spots = pgTable("spots", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  positionOrder: integer("position_order").notNull(),
  minBid: integer("min_bid").notNull().default(50000),
  currentPrice: integer("current_price").notNull().default(0),
  currentBrandId: integer("current_brand_id").references(
    (): AnyPgColumn => brands.id
  ),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  spotId: integer("spot_id")
    .references(() => spots.id)
    .notNull(),
  brandId: integer("brand_id")
    .references(() => brands.id)
    .notNull(),
  /** lo que se le cobra a la marca en esta transaccion */
  amount: integer("amount").notNull(),
  /**
   * Precio al que queda la zona si el pago se aprueba. Se guarda aparte porque
   * no siempre coincide con `amount`: una marca que regresa a una zona que ya
   * ocupaba paga solo la diferencia, y ahora cada quien elige cuanto pujar.
   */
  bidPrice: integer("bid_price"),
  previousPrice: integer("previous_price"),
  isOutbid: boolean("is_outbid").default(false),
  wompiTransactionId: varchar("wompi_transaction_id", { length: 100 }),
  // Id del Enlace de Pago. Es lo unico que liga un cobro con esta puja: la
  // transaccion de Wompi trae idExterno en NULL para pagos por enlace.
  wompiLinkId: varchar("wompi_link_id", { length: 50 }),
  wompiReference: varchar("wompi_reference", { length: 100 }).unique(),
  status: varchar("status", { length: 20 }).default("pending"),
  // Se marca cuando el pago se aprobo pero la zona ya se la habia llevado otra
  // marca a un precio mayor: hay que devolver el dinero.
  needsRefund: boolean("needs_refund").default(false),
  // Como se confirmo el pago: "webhook" o "reconcile" (consulta a la API).
  settledVia: varchar("settled_via", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Registro de todo lo que llega al webhook, incluso lo que se rechaza.
 * Sin esto no hay forma de saber si Wompi llamo y con que cuerpo.
 */
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  body: text("body"),
  outcome: varchar("outcome", { length: 40 }),
  reference: varchar("reference", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Visitas al sitio. Una fila por visitante y por dia: `visitorHash` es
 * SHA-256(ip + user-agent + fecha + salt), asi que no se guarda ninguna IP ni
 * nada que identifique a la persona, y recargar la pagina no infla el numero.
 */
export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  visitorHash: varchar("visitor_hash", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const spotsRelations = relations(spots, ({ one, many }) => ({
  currentBrand: one(brands, {
    fields: [spots.currentBrandId],
    references: [brands.id],
  }),
  bids: many(bids),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  bids: many(bids),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  spot: one(spots, { fields: [bids.spotId], references: [spots.id] }),
  brand: one(brands, { fields: [bids.brandId], references: [brands.id] }),
}));

export type Spot = typeof spots.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type Bid = typeof bids.$inferSelect;
export type Visit = typeof visits.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
