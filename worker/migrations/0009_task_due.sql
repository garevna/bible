-- The last day of a post asked of a servant ('YYYY-MM-DD'), or NULL without one
ALTER TABLE post_tasks ADD COLUMN due TEXT;
