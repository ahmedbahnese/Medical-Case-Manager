import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const inboundMessagesTable = sqliteTable("inbound_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channel: text("channel").notNull(),
  externalMessageId: text("external_message_id").unique(),
  senderId: text("sender_id").notNull(),
  senderName: text("sender_name"),
  body: text("body"),
  rawPayload: text("raw_payload"),
  status: text("status").notNull().default("received"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export type InboundMessage = typeof inboundMessagesTable.$inferSelect;
