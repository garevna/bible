-- What a task asks for: a post (a note or a topic) or a picture
ALTER TABLE post_tasks ADD COLUMN kind TEXT NOT NULL DEFAULT 'post';
