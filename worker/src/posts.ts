import type { TopicPost } from './post'

/**
 * The posts of the public channel: a servant sends a note or a topic for publication, a pastor who
 * decides approves it (or returns it with a word) when it needs that, and the administrator of the
 * channel (the right to publish) adds a picture and publishes it. A pastor may ask a servant to
 * prepare one (a task), saying who approves it.
 */
export interface Submission {
  id: string
  kind: 'note' | 'topic'
  title: string
  post: TopicPost
  authorUid: string
  authorName: string
  /** who approves it; null: it needs no approval */
  approverUid: string | null
  approverName: string | null
  /** pending: waiting for the approval; approved: ready for the channel (approved, or needing none) */
  status: 'pending' | 'approved' | 'returned' | 'published'
  /** the word of the one who returned it */
  comment: string
  /** the task it answers */
  taskId: string | null
  createdAt: number
  decidedAt: number | null
  publishedAt: number | null
  publishedBy: string | null
}

/** A post asked of a servant by a pastor, and who approves it */
export interface PostTask {
  id: string
  byUid: string
  byName: string
  assigneeUid: string
  assigneeName: string
  /** what to prepare */
  text: string
  approverUid: string | null
  approverName: string | null
  status: 'open' | 'done'
  createdAt: number
}

export interface PostsStore {
  submissions(): Promise<Submission[]>
  submission(id: string): Promise<Submission | null>
  putSubmission(item: Submission): Promise<void>
  deleteSubmission(id: string): Promise<void>
  tasks(): Promise<PostTask[]>
  task(id: string): Promise<PostTask | null>
  putTask(item: PostTask): Promise<void>
  deleteTask(id: string): Promise<void>
  /** the published and returned posts and the done tasks older than a time go */
  deleteOld(before: number): Promise<void>
}

interface SubmissionRow {
  id: string
  kind: string
  title: string
  post: string
  author_uid: string
  author_name: string
  approver_uid: string | null
  approver_name: string | null
  status: string
  comment: string
  task_id: string | null
  created_at: number
  decided_at: number | null
  published_at: number | null
  published_by: string | null
}

interface TaskRow {
  id: string
  by_uid: string
  by_name: string
  assignee_uid: string
  assignee_name: string
  text: string
  approver_uid: string | null
  approver_name: string | null
  status: string
  created_at: number
}

const submissionOf = (row: SubmissionRow): Submission => ({
  id: row.id,
  kind: row.kind === 'topic' ? 'topic' : 'note',
  title: row.title,
  post: JSON.parse(row.post) as TopicPost,
  authorUid: row.author_uid,
  authorName: row.author_name,
  approverUid: row.approver_uid,
  approverName: row.approver_name,
  status: (['pending', 'approved', 'returned', 'published'].includes(row.status)
    ? row.status
    : 'pending') as Submission['status'],
  comment: row.comment,
  taskId: row.task_id,
  createdAt: row.created_at,
  decidedAt: row.decided_at,
  publishedAt: row.published_at,
  publishedBy: row.published_by
})

const taskOf = (row: TaskRow): PostTask => ({
  id: row.id,
  byUid: row.by_uid,
  byName: row.by_name,
  assigneeUid: row.assignee_uid,
  assigneeName: row.assignee_name,
  text: row.text,
  approverUid: row.approver_uid,
  approverName: row.approver_name,
  status: row.status === 'done' ? 'done' : 'open',
  createdAt: row.created_at
})

export function d1Posts(db: D1Database): PostsStore {
  return {
    async submissions() {
      const { results } = await db
        .prepare('SELECT * FROM submissions ORDER BY created_at DESC')
        .all<SubmissionRow>()
      return results.map(submissionOf)
    },
    async submission(id) {
      const row = await db.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first<SubmissionRow>()
      return row ? submissionOf(row) : null
    },
    async putSubmission(s) {
      await db
        .prepare(
          'INSERT OR REPLACE INTO submissions (id, kind, title, post, author_uid, author_name, approver_uid, approver_name, status, comment, task_id, created_at, decided_at, published_at, published_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          s.id,
          s.kind,
          s.title,
          JSON.stringify(s.post),
          s.authorUid,
          s.authorName,
          s.approverUid,
          s.approverName,
          s.status,
          s.comment,
          s.taskId,
          s.createdAt,
          s.decidedAt,
          s.publishedAt,
          s.publishedBy
        )
        .run()
    },
    async deleteSubmission(id) {
      await db.prepare('DELETE FROM submissions WHERE id = ?').bind(id).run()
    },
    async tasks() {
      const { results } = await db.prepare('SELECT * FROM post_tasks ORDER BY created_at DESC').all<TaskRow>()
      return results.map(taskOf)
    },
    async task(id) {
      const row = await db.prepare('SELECT * FROM post_tasks WHERE id = ?').bind(id).first<TaskRow>()
      return row ? taskOf(row) : null
    },
    async putTask(t) {
      await db
        .prepare(
          'INSERT OR REPLACE INTO post_tasks (id, by_uid, by_name, assignee_uid, assignee_name, text, approver_uid, approver_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          t.id,
          t.byUid,
          t.byName,
          t.assigneeUid,
          t.assigneeName,
          t.text,
          t.approverUid,
          t.approverName,
          t.status,
          t.createdAt
        )
        .run()
    },
    async deleteTask(id) {
      await db.prepare('DELETE FROM post_tasks WHERE id = ?').bind(id).run()
    },
    async deleteOld(before) {
      await db.batch([
        db
          .prepare("DELETE FROM submissions WHERE status IN ('published', 'returned') AND created_at < ?")
          .bind(before),
        db.prepare("DELETE FROM post_tasks WHERE status = 'done' AND created_at < ?").bind(before)
      ])
    }
  }
}

/** The same in memory: for the tests */
export function memoryPosts(): PostsStore {
  let submissions: Submission[] = []
  let tasks: PostTask[] = []
  return {
    submissions: async () => [...submissions].sort((a, b) => b.createdAt - a.createdAt),
    submission: async (id) => submissions.find((item) => item.id === id) ?? null,
    async putSubmission(item) {
      submissions = [...submissions.filter((other) => other.id !== item.id), item]
    },
    async deleteSubmission(id) {
      submissions = submissions.filter((item) => item.id !== id)
    },
    tasks: async () => [...tasks].sort((a, b) => b.createdAt - a.createdAt),
    task: async (id) => tasks.find((item) => item.id === id) ?? null,
    async putTask(item) {
      tasks = [...tasks.filter((other) => other.id !== item.id), item]
    },
    async deleteTask(id) {
      tasks = tasks.filter((item) => item.id !== id)
    },
    async deleteOld(before) {
      submissions = submissions.filter(
        (item) => !(['published', 'returned'].includes(item.status) && item.createdAt < before)
      )
      tasks = tasks.filter((item) => !(item.status === 'done' && item.createdAt < before))
    }
  }
}
