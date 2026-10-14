-- the time of some weekdays of a repeated event: JSON { "6": "08:00" } (NULL: the same every day)
ALTER TABLE events ADD COLUMN times TEXT;
-- who may apply to an open event: 'ministry' (its members), 'servants' (any minister), 'everyone'
ALTER TABLE events ADD COLUMN applicants TEXT NOT NULL DEFAULT 'ministry';

-- one day of an event changed: another time or place, another number of people, or cancelled
CREATE TABLE day_changes (
  event_id TEXT NOT NULL,
  day TEXT NOT NULL,
  time TEXT,
  location TEXT,
  needed INTEGER,
  cancelled INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (event_id, day)
);
CREATE INDEX day_changes_day ON day_changes (day);
