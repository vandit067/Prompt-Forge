import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const DATA_DIR = process.env.ELECTRON_USER_DATA
  ? process.env.ELECTRON_USER_DATA
  : (() => {
      try {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        return join(__dirname, '..', 'data');
      } catch {
        // Fallback for bundled CJS where import.meta.url is unavailable
        return join(process.cwd(), 'data');
      }
    })();
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'prompt-forge.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    input           TEXT NOT NULL,
    task_type       TEXT NOT NULL,
    project_path    TEXT,
    project_context TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    error_notes     TEXT,
    generated_prompts   TEXT NOT NULL DEFAULT '[]',
    generated_files     TEXT NOT NULL DEFAULT '[]',
    generated_plan      TEXT NOT NULL DEFAULT '[]',
    generated_checklist TEXT NOT NULL DEFAULT '[]',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

  CREATE TABLE IF NOT EXISTS failures (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    error_type  TEXT,
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_failures_task_id ON failures(task_id);
  CREATE INDEX IF NOT EXISTS idx_failures_created_at ON failures(created_at DESC);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export const stmts = {
  insertTask: db.prepare(`
    INSERT INTO tasks
      (id, title, input, task_type, project_path, project_context, status,
       generated_prompts, generated_files, generated_plan, generated_checklist,
       created_at, updated_at)
    VALUES
      (@id, @title, @input, @task_type, @project_path, @project_context, @status,
       @generated_prompts, @generated_files, @generated_plan, @generated_checklist,
       @created_at, @updated_at)
  `),

  getAllTasks: db.prepare(`
    SELECT * FROM tasks ORDER BY created_at DESC
  `),

  getTask: db.prepare(`SELECT * FROM tasks WHERE id = ?`),

  updateTaskPrompts: db.prepare(`
    UPDATE tasks
    SET generated_prompts   = @generated_prompts,
        generated_files     = @generated_files,
        generated_plan      = @generated_plan,
        generated_checklist = @generated_checklist,
        updated_at          = @updated_at
    WHERE id = @id
  `),

  updateStatus: db.prepare(`
    UPDATE tasks SET status = @status, error_notes = @error_notes, updated_at = @updated_at
    WHERE id = @id
  `),

  deleteTask: db.prepare(`
    DELETE FROM tasks WHERE id = @id
  `),

  insertFailure: db.prepare(`
    INSERT INTO failures (task_id, error_type, notes) VALUES (?, ?, ?)
  `),

  getFailuresByTaskType: db.prepare(`
    SELECT f.notes, f.created_at
    FROM failures f
    JOIN tasks t ON f.task_id = t.id
    WHERE t.task_type = ?
      AND f.notes IS NOT NULL
      AND f.notes != ''
    ORDER BY f.created_at DESC
    LIMIT 10
  `),

  getSetting: db.prepare(`SELECT value FROM settings WHERE key = ?`),
  setSetting: db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`),
  getAllSettings: db.prepare(`SELECT key, value FROM settings`),
};

export default db;
