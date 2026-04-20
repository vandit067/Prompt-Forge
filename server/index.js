import express from 'express';
import cors from 'cors';
import { stmts } from './db.js';
import { spawnClaude, buildTask, buildFallbackTask } from './claude-cli.js';
import { scanProject } from './project-scanner.js';

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

// POST /api/scan-project — scan a project folder for context
app.post('/api/scan-project', async (req, res) => {
  const { path: folderPath } = req.body;

  if (!folderPath) {
    return res.status(400).json({ error: 'path required' });
  }

  try {
    const context = await scanProject(folderPath);
    res.json(context);
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Folder not found' });
    }
    if (err.code === 'NOT_DIRECTORY') {
      return res.status(400).json({ error: 'Path is not a directory' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/generate — generate a new task via Claude Code CLI
app.post('/api/generate', async (req, res) => {
  const { input, projectPath, projectContext } = req.body;

  if (!input?.trim()) {
    return res.status(400).json({ error: 'input required' });
  }

  let kill = null;
  req.on('close', () => {
    if (kill) kill();
  });

  try {
    const parsed = await spawnClaude(input, {
      onAbort: (fn) => {
        kill = fn;
      },
      projectContext: projectContext?.promptBlock,
    });

    const task = buildTask(parsed, input, projectPath, projectContext);
    stmts.insertTask.run({
      id: task.id,
      title: task.title,
      input: task.input,
      task_type: task.taskType,
      project_path: task.projectPath ?? null,
      project_context: null,
      status: task.status,
      generated_prompts: JSON.stringify(task.generatedPrompts),
      generated_files: JSON.stringify(task.generatedFiles),
      generated_plan: JSON.stringify(task.generatedPlan),
      generated_checklist: JSON.stringify(task.generatedChecklist),
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    });

    res.json(task);
  } catch (err) {
    if (err.code === 'CANCELLED') {
      return res.status(499).json({ error: 'cancelled' });
    }
    if (err.code === 'CLI_NOT_INSTALLED') {
      return res.status(422).json({ error: 'CLI_NOT_INSTALLED' });
    }
    if (err.code === 'PARSE_ERROR') {
      // Fallback: output raw response as a single prompt
      const task = buildFallbackTask(input, err.raw, projectPath, projectContext);
      stmts.insertTask.run({
        id: task.id,
        title: task.title,
        input: task.input,
        task_type: task.taskType,
        project_path: task.projectPath ?? null,
        project_context: null,
        status: task.status,
        generated_prompts: JSON.stringify(task.generatedPrompts),
        generated_files: JSON.stringify(task.generatedFiles),
        generated_plan: JSON.stringify(task.generatedPlan),
        generated_checklist: JSON.stringify(task.generatedChecklist),
        created_at: task.createdAt,
        updated_at: task.updatedAt,
      });
      return res.json(task);
    }
    res.status(500).json({
      error: err.message || 'Generation failed',
      code: err.code,
    });
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
