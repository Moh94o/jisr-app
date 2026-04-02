-- ═══ Migration: Enhanced Internal Messages ═══
-- Run this in Supabase SQL Editor

-- Add new columns to internal_messages
ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES internal_messages(id);
ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS context_type TEXT; -- 'invoice', 'transaction', 'facility', 'worker'
ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS context_id UUID;
ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS context_label TEXT;
ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES users(id); -- for direct messages

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_internal_messages_reply ON internal_messages(reply_to);
CREATE INDEX IF NOT EXISTS idx_internal_messages_pinned ON internal_messages(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_internal_messages_recipient ON internal_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_channel ON internal_messages(channel);
