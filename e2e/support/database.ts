// Test data goes straight into the local Postgres. Writing as the database owner skips RLS and
// the server-field trigger, so a test can set up any state it needs (for example a task that
// was completed 400 days ago) without going through the UI.
import pg from 'pg';
import { DATABASE_URL } from './local-stack';

export interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: string;
  created_at: Date;
  completed_at: Date | null;
  completed_by: string | null;
}

export async function withDatabase<T>(work: (db: pg.Client) => Promise<T>): Promise<T> {
  const db = new pg.Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    return await work(db);
  } finally {
    await db.end();
  }
}

export interface NewTask {
  title: string;
  assignee: string;
  priority?: 'low' | 'medium' | 'high';
  createdDaysAgo?: number;
  // Completed this many days ago, by the assignee. Omit for an open task.
  completedDaysAgo?: number;
}

export function insertTasks(tasks: NewTask[]): Promise<void> {
  return withDatabase(async db => {
    for (const t of tasks) {
      const completed = t.completedDaysAgo !== undefined;
      await db.query(
        `insert into public.tasks (title, assignee, priority, status, created_at, completed_at, completed_by)
         values ($1, $2, $3, $4,
                 now() - make_interval(days => $5),
                 case when $4 = 'completed' then now() - make_interval(days => $6) end,
                 case when $4 = 'completed' then $2 end)`,
        [t.title, t.assignee, t.priority ?? 'medium', completed ? 'completed' : 'pending',
         t.createdDaysAgo ?? 0, t.completedDaysAgo ?? 0],
      );
    }
  });
}

export function findTask(title: string): Promise<TaskRow | undefined> {
  return withDatabase(async db => {
    const { rows } = await db.query<TaskRow>('select * from public.tasks where title = $1', [title]);
    return rows[0];
  });
}

export function deleteTasksStartingWith(prefix: string): Promise<void> {
  return withDatabase(async db => {
    await db.query(`delete from public.tasks where starts_with(title, $1)`, [prefix]);
  });
}
