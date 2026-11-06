-- The archive of the pictures kept in the private channel of the bot: only what is known of them (the
-- pictures themselves stay in Telegram). message_id: the message of the channel, so that it is removed
-- there too; NULL for the pictures kept before the archive
CREATE TABLE pictures (
  id TEXT PRIMARY KEY,
  message_id INTEGER,
  title TEXT NOT NULL DEFAULT '',
  uid TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX pictures_created ON pictures (created_at);
