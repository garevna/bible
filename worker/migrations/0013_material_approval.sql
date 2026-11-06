-- The materials of an event may need the approval of a pastor: the pastor of the event, and the state
-- of each material ('approved' before: nothing waited for an approval)
ALTER TABLE events ADD COLUMN approver_uid TEXT;
ALTER TABLE events ADD COLUMN approver_name TEXT;
ALTER TABLE materials ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
-- the word of the pastor who returned it, and who decided
ALTER TABLE materials ADD COLUMN review_note TEXT;
ALTER TABLE materials ADD COLUMN reviewed_by TEXT;
