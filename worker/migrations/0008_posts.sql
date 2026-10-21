-- The posts of the public channel sent for publication, approved (or not needing it) and published;
-- and the posts asked of a servant by a pastor (see posts.ts)
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  -- 'note' or 'topic'; the post as the app sends it: JSON { title, items, image? }
  kind TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  post TEXT NOT NULL,
  author_uid TEXT NOT NULL,
  author_name TEXT NOT NULL,
  -- who approves it; NULL: it needs no approval
  approver_uid TEXT,
  approver_name TEXT,
  -- 'pending', 'approved', 'returned' or 'published'
  status TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  task_id TEXT,
  created_at INTEGER NOT NULL,
  decided_at INTEGER,
  published_at INTEGER,
  published_by TEXT
);
CREATE INDEX submissions_status ON submissions (status);

CREATE TABLE post_tasks (
  id TEXT PRIMARY KEY,
  by_uid TEXT NOT NULL,
  by_name TEXT NOT NULL,
  assignee_uid TEXT NOT NULL,
  assignee_name TEXT NOT NULL,
  text TEXT NOT NULL,
  approver_uid TEXT,
  approver_name TEXT,
  -- 'open' or 'done'
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
