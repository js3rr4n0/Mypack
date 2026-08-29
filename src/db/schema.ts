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
  amount: integer("amount").notNull(),
  previousPrice: integer("previous_price"),
  isOutbid: boolean("is_outbid").default(false),
  wompiTransactionId: varchar("wompi_transaction_id", { length: 100 }),
  wompiReference: varchar("wompi_reference", { length: 100 }).unique(),
  status: varchar("status", { length: 20 }).default("pending"),
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
