import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // "trello", "notion", "gmail"
  name: text("name").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  connected: boolean("connected").default(false).notNull(),
  lastSynced: timestamp("last_synced"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const widgets = pgTable("widgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // "trello-tasks", "notion-pages", "gmail", "analytics", "quick-actions", "upcoming-deadlines"
  name: text("name").notNull(),
  config: jsonb("config"), // Widget-specific configuration
  position: integer("position").default(0), // Order in the grid
  gridPosition: jsonb("grid_position").default({}).notNull(), // {x, y, w, h} for grid positioning
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

// Integration schemas
export const insertIntegrationSchema = createInsertSchema(integrations)
  .omit({
    id: true,
    createdAt: true,
    userId: true, // Omit userId completely as we'll add it from the session
  })
  .extend({
    // Override date fields to accept ISO strings or Date objects
    tokenExpiry: z.string().datetime().nullable().optional(),
    lastSynced: z.string().datetime().nullable().optional(),
  });

// Widget schemas
export const insertWidgetSchema = createInsertSchema(widgets).omit({
  id: true,
  createdAt: true,
  userId: true, // Omit userId completely as we'll add it from the session
});

export const updateWidgetPositionSchema = z.object({
  id: z.number(),
  gridPosition: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;

export type Widget = typeof widgets.$inferSelect;
export type InsertWidget = z.infer<typeof insertWidgetSchema>;
export type UpdateWidgetPosition = z.infer<typeof updateWidgetPositionSchema>;
