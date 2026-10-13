-- The schedule of ministries: events and the people who serve at them; past ones are deleted every night
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  ministry TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  -- a single event: its day 'YYYY-MM-DD'; a repeated one: NULL
  day TEXT,
  -- a repeated event: the days of the week, '1,2,3,4,5,6' (0 is Sunday); a single one: NULL
  weekdays TEXT,
  -- 'HH:MM', the local time of the church
  time TEXT NOT NULL,
  -- a repeated event ends after this day (NULL: it goes on)
  until TEXT,
  -- how many people it needs
  needed INTEGER NOT NULL DEFAULT 1,
  -- 'invite': the responsible person invites; 'open': the members of the ministry apply
  mode TEXT NOT NULL DEFAULT 'invite',
  responsible_uid TEXT NOT NULL,
  responsible_name TEXT NOT NULL,
  -- the one the responsible person hands the event over to while away
  deputy_uid TEXT,
  deputy_name TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- one row per person and day of an event
CREATE TABLE participants (
  event_id TEXT NOT NULL,
  day TEXT NOT NULL,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  -- 'invited', 'applied', 'confirmed', 'declined'
  status TEXT NOT NULL,
  backup_uid TEXT,
  backup_name TEXT,
  -- 'invited', 'confirmed', 'declined'
  backup_status TEXT,
  reason TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (event_id, day, uid)
);

CREATE INDEX participants_day ON participants (day);
CREATE INDEX participants_backup ON participants (backup_uid);
CREATE INDEX events_day ON events (day);
