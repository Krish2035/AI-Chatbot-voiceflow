import { pgTable, serial, text, varchar, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Users Table
 * Supports standard local credentials (bcrypt hashed) & Firebase Google authentication
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  displayName: varchar('display_name', { length: 150 }).notNull(),
  avatarUrl: text('avatar_url'),
  authProvider: varchar('auth_provider', { length: 30 }).default('local').notNull(), // 'local' | 'google'
  firebaseUid: varchar('firebase_uid', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_users_email').on(table.email),
  index('idx_users_firebase_uid').on(table.firebaseUid)
]);

/**
 * Conversations Table
 * Allows user-associated chats or anonymous/guest sessions
 */
export const conversations = pgTable('conversations', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_conversations_user_id').on(table.userId),
  index('idx_conversations_updated_at').on(table.updatedAt)
]);

/**
 * Messages Table
 * Full multi-turn conversational history with search indexing
 */
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: varchar('conversation_id', { length: 64 })
    .references(() => conversations.id, { onDelete: 'cascade' })
    .notNull(),
  sender: varchar('sender', { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_messages_conversation_id').on(table.conversationId, table.createdAt),
  index('idx_messages_sender').on(table.sender),
  // Search index on message content
  index('idx_messages_content').on(table.content)
]);

export default {
  users,
  conversations,
  messages
};
