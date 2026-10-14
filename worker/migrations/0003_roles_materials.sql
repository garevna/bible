-- Types of events, the roles of their people, and the materials the people prepare for their roles
ALTER TABLE events ADD COLUMN type_id TEXT;
-- the roles of the event: JSON [{ name, count, materials, hint }] (NULL: no roles)
ALTER TABLE events ADD COLUMN slots TEXT;
-- the role a person takes at the event (the name of a slot)
ALTER TABLE participants ADD COLUMN role TEXT;

CREATE TABLE materials (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  day TEXT NOT NULL,
  role TEXT NOT NULL,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  -- 'note' or 'topic'; the post as the app sends it: JSON { title, items }
  kind TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  post TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX materials_event_day ON materials (event_id, day);
CREATE INDEX materials_day ON materials (day);
