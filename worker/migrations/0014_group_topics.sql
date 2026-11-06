-- The topics of the meetings of the home groups: prepared by the ministry of the groups, approved by a
-- pastor, sent to the leaders of the groups (the topic itself, its state and its marks are in data)
CREATE TABLE group_topics (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX group_topics_created ON group_topics (created_at);
