-- Messages between ministers; each row is one message to one recipient, kept for a day
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  from_uid TEXT NOT NULL,
  from_name TEXT NOT NULL,
  to_uid TEXT NOT NULL,
  to_name TEXT NOT NULL,
  text TEXT NOT NULL,
  -- JSON: a note or a topic, as the post of the Telegram channel (see src/post.ts)
  attachment TEXT,
  reply_to TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  read_at INTEGER
);

CREATE INDEX messages_to ON messages (to_uid, created_at);
CREATE INDEX messages_from ON messages (from_uid, created_at);
CREATE INDEX messages_expires ON messages (expires_at);
