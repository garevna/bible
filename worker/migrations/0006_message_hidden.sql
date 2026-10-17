-- a message deleted by one side is hidden from that side only; it goes once both deleted it (or it expired)
ALTER TABLE messages ADD COLUMN hidden_to INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN hidden_from INTEGER NOT NULL DEFAULT 0;
