import express from 'express';
import cors from 'cors';
import { stmts } from './db.js';
import { generateLocalTask } from './task-generator.js';
import { scanProject } from './project-scanner.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

// Classify error type based on error notes content
function classifyErrorType(notes) {
  if (!notes) return 'unknown';
  const lower = notes.toLowerCase();
  if (lower.includes('syntax') || lower.includes('parse')) return 'syntax_error';
  if (lower.includes('type') || lower.includes('typing')) return 'type_error';
  if (lower.includes('import') || lower.includes('module not found')) return 'import_error';
  if (lower.includes('runtime') || lower.includes('not defined')) return 'runtime_error';
  if (lower.includes('timeout') || lower.includes('too long')) return 'timeout';
  if (lower.includes('memory') || lower.includes('heap')) return 'memory_error';
  if (lower.includes('network') || lower.includes('connection')) return 'network_error';
  if (lower.includes('permission') || lower.includes('access denied')) return 'permission_error';
  if (lower.includes('database') || lower.includes('query')) return 'database_error';
  if (lower.includes('logic') || lower.includes('incorrect')) return 'logic_error';
  if (lower.includes('missing') || lower.includes('not found')) return 'missing_requirement';
  return 'user_reported';
}

function rowToTask(row) {
  let projectContext;
  if (row.project_context) {
    try {
      projectContext = JSON.parse(row.project_context);
    } catch {
      projectContext = undefined;
    }
  }

  return {
    id:               row.id,
    title:            row.title,
    input:            row.input,
    taskType:         row.task_type,
    projectPath:      row.project_path ?? undefined,
    projectContext:   projectContext,
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

// GET /api/failures/count — get failure count for a task type
app.get('/api/failures/count', (req, res) => {
  const { taskType } = req.query;
  if (!taskType) {
    return res.status(400).json({ error: 'taskType required' });
  }
  try {
    const rows = stmts.getFailuresByTaskType.all(taskType);
    res.json({ count: rows.length, notes: rows.map(r => r.notes) });
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

// POST /api/generate — generate a new task spec locally
app.post('/api/generate', async (req, res) => {
  console.log('[generate] Request received');
  const { input, projectPath, projectContext } = req.body;

  if (!input?.trim()) {
    console.log('[generate] No input provided');
    return res.status(400).json({ error: 'input required' });
  }

  try {
    console.log('[generate] Generating task spec...');
    // Generate task spec locally (no API calls, no CLI)
    const task = generateLocalTask(input, projectPath, projectContext);
    console.log('[generate] Task generated:', task.id);

    console.log('[generate] Saving to database...');
    // Save to database
    stmts.insertTask.run({
      id: task.id,
      title: task.title,
      input: task.input,
      task_type: task.taskType,
      project_path: task.projectPath ?? null,
      project_context: task.projectContext ? JSON.stringify(task.projectContext) : null,
      status: task.status,
      generated_prompts: JSON.stringify(task.generatedPrompts),
      generated_files: JSON.stringify(task.generatedFiles),
      generated_plan: JSON.stringify(task.generatedPlan),
      generated_checklist: JSON.stringify(task.generatedChecklist),
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    });
    console.log('[generate] Saved to database');

    console.log('[generate] Sending response...');
    res.json(task);
    console.log('[generate] Response sent');
  } catch (err) {
    console.error('[generate] Error:', err.message, err.stack);
    res.status(500).json({
      error: err.message || 'Generation failed',
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
      const errorType = classifyErrorType(errorNotes);
      stmts.insertFailure.run(req.params.id, errorType, errorNotes);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings — get all user settings
app.get('/api/settings', (_req, res) => {
  try {
    const rows = stmts.getAllSettings.all();
    const settings = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings — save user settings
app.post('/api/settings', (req, res) => {
  const settings = req.body;
  try {
    for (const [key, value] of Object.entries(settings)) {
      stmts.setSetting.run(key, String(value));
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`API server → http://localhost:${PORT}`));
