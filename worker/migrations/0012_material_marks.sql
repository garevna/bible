-- A kind of the materials of a role, marked ready (by the person of the role or an approver).
-- resource: the id of the kind, '' for the materials of a role of no kinds
CREATE TABLE material_marks (
  event_id TEXT NOT NULL,
  day TEXT NOT NULL,
  role TEXT NOT NULL,
  resource TEXT NOT NULL,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (event_id, day, role, resource)
);
CREATE INDEX material_marks_day ON material_marks (day);
