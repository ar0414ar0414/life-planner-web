import {
  pgTable, text, integer, real, uuid, timestamp, uniqueIndex, // real は swr/annual_return_rate で使用
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const monthlyFinance = pgTable("monthly_finance", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  yearMonth: text("year_month").notNull(), // YYYY-MM
  income: integer("income").notNull().default(0),
  fixedExpense: integer("fixed_expense").notNull().default(0),
  variableExpense: integer("variable_expense").notNull().default(0),
  bonus: integer("bonus").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("monthly_finance_user_month").on(t.userId, t.yearMonth)]);

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // cash / stock / ideco / insurance / other
  amount: integer("amount").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const liabilities = pgTable("liabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // mortgage / car / student / other
  amount: integer("amount").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fireSettings = pgTable("fire_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  fireType: text("fire_type").notNull().default("fire"), // fire / semi / coast / fat / lean
  annualExpense: integer("annual_expense").notNull().default(300),
  sideIncome: integer("side_income").notNull().default(0),
  currentAge: integer("current_age").notNull().default(30),
  targetFireAge: integer("target_fire_age").notNull().default(50),
  coastRetireAge: integer("coast_retire_age").notNull().default(65),
  swr: real("swr").notNull().default(0.04),
  annualReturnRate: real("annual_return_rate").notNull().default(5),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const lifeEvents = pgTable("life_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // housing / retirement / wedding / education / travel / other
  targetAmount: integer("target_amount").notNull(),
  targetDate: text("target_date").notNull(), // YYYY-MM
  priority: integer("priority").notNull().default(2), // 1=high 2=medium 3=low
  memo: text("memo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assetSnapshots = pgTable("asset_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  yearMonth: text("year_month").notNull(), // YYYY-MM
  totalAssets: integer("total_assets").notNull(),
  savings: integer("savings").notNull().default(0),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("asset_snapshots_user_month").on(t.userId, t.yearMonth)]);

export type User = typeof users.$inferSelect;
export type MonthlyFinance = typeof monthlyFinance.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Liability = typeof liabilities.$inferSelect;
export type FireSettings = typeof fireSettings.$inferSelect;
export type LifeEvent = typeof lifeEvents.$inferSelect;
export type AssetSnapshot = typeof assetSnapshots.$inferSelect;
