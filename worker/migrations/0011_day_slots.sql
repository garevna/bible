-- the roles of one day of an event (a feast, guests): JSON of the slots; null keeps the roles of the event
ALTER TABLE day_changes ADD COLUMN slots TEXT;
