-- an invitation in a message: the days it asks to answer, JSON [{ eventId, day, uid, as }] (NULL: none)
ALTER TABLE messages ADD COLUMN asks TEXT;
