import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  images: text("images").notNull(), // JSON string array of image URLs
  quota: integer("quota").notNull().default(500),
  quotaUsed: integer("quota_used").notNull().default(0),
  badge: text("badge").notNull().default("Haftalık"), // e.g. "Flaş", "Haftalık", "Özel Gün"
  prizes: text("prizes").notNull(), // JSON string of prize options with probabilities
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const participations = pgTable("participations", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fullPhone: text("full_phone").notNull(),
  phoneLastFour: text("phone_last_four").notNull(),
  ipAddress: text("ip_address").notNull(),
  cookieId: text("cookie_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const spinners = pgTable("spinners", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fullPhone: text("full_phone").notNull(),
  phoneLastFour: text("phone_last_four").notNull(),
  prizeWon: text("prize_won").notNull(),
  promoCode: text("promo_code").notNull(),
  used: boolean("used").notNull().default(false),
  ipAddress: text("ip_address").notNull(),
  cookieId: text("cookie_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
