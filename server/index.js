import express from 'express';
import cors from 'cors';
import { stmts } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

function rowToTask(row) {
  return {
    id:               row.id,
    title:            row.title,
    input:            row.input,
    taskType:         row.task_type,
    projectPath:      row.project_path ?? undefined,
    projectContext:   row.project_context ?? undefined,
    status:           row.status,
    errorNotes:       row.error_notes ?? undefined,
    generatedPrompts: JSON.parse(row.generated_prompts),
    generatedFiles:   JSON.parse(row.generated_files),
    generatedPlan:    JSON.parse(row.generated_plan),
    generatedChecklist: JSON.parse(row.generated_checklist),
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

// GET /api/tasks — all tasks, newest first
app.get('/api/tasks', (_req, res) => {
  try {
    const rows = stmts.getAllTasks.all();
    res.json(rows.map(rowToTask));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — save a new task
app.post('/api/tasks', (req, res) => {
  const t = req.body;
  try {
    stmts.insertTask.run({
      id:                  t.id,
      title:               t.title,
      input:               t.input,
      task_type:           t.taskType,
      project_path:        t.projectPath ?? null,
      project_context:     t.projectContext ?? null,
      status:              t.status,
      generated_prompts:   JSON.stringify(t.generatedPrompts),
      generated_files:     JSON.stringify(t.generatedFiles),
      generated_plan:      JSON.stringify(t.generatedPlan),
      generated_checklist: JSON.stringify(t.generatedChecklist),
      created_at:          t.createdAt,
      updated_at:          t.updatedAt,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id — update status and error notes
app.patch('/api/tasks/:id', (req, res) => {
  const { status, errorNotes } = req.body;
  try {
    stmts.updateStatus.run({
      id:          req.params.id,
      status,
      error_notes: errorNotes ?? null,
      updated_at:  new Date().toISOString(),
    });
    if (status === 'error' && errorNotes) {
      stmts.insertFailure.run(req.params.id, 'user_reported', errorNotes);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`API server → http://localhost:${PORT}`));
