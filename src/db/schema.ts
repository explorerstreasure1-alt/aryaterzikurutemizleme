import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

// All timestamp columns use withTimezone: true to prevent timezone shift
// Client sends ISO UTC strings (.toISOString()), server stores in UTC consistently
const tz = { withTimezone: true };

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  startDate: timestamp("start_date", tz).notNull(),
  endDate: timestamp("end_date", tz).notNull(),
  images: text("images").notNull(),
  quota: integer("quota").notNull().default(500),
  quotaUsed: integer("quota_used").notNull().default(0),
  badge: text("badge").notNull().default("Haftalık"),
  prizes: text("prizes").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
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
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
});

export const musicTracks = pgTable("music_tracks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
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
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
});
