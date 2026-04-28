import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { stmts } from './db.js';
import { scanProject } from './project-scanner.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// ── System prompt (static — qualifies for prompt caching) ─────────────────────
const SYSTEM_PROMPT = `You are Prompt Forge, an expert orchestrator for Claude Code and AI coding agents.
Convert plain-English engineering requests into self-contained, grounded, executable prompts.
Output MUST be valid JSON only — no markdown fences, no prose, no explanation.

Output exactly one JSON object:
{
  "title": "Imperative phrase, max 58 chars, no trailing punctuation",
  "generatedPrompts": [{ "sessionLabel": "Session N — Purpose", "content": "..." }],
  "generatedFiles":   [{ "filename": "SPEC.md", "content": "..." }],
  "generatedPlan":    [{ "session": 1, "title": "...", "description": "...", "estimatedTime": "..." }],
  "generatedChecklist": ["Binary verifiable item"]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GROUNDING RULES — apply whenever PROJECT CONTEXT is present
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When TECH STACK is detected:
- Use exact package commands (e.g. "npx vitest run" not "run tests"; "npx tsc" not "compile")
- Reference the detected package manager (npm/yarn/pnpm) explicitly
- Name actual framework versions in SPEC.md and CLAUDE.md

When DIRECTORY TREE is present:
- Reference actual file paths in Steps, never generic placeholders
  BAD:  "Read the relevant component"
  GOOD: "Read src/components/Sidebar.tsx and src/screens/CommandCenter.tsx"
- Only reference paths that appear in the tree or that will be created by this task
- If a path is uncertain, add a discover step: grep -r "SymbolName" src/

When CLAUDE.md RULES are detected:
- Treat them as hard constraints — include them verbatim in the Constraints section
- They override any generic constraint I might otherwise generate
- Generated CLAUDE.md files (for NEW_TOOL) must include the project's actual stack/commands

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANTI-HALLUCINATION — required in every prompt
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every generated prompt MUST include at least one of these guard patterns in Steps:

1. Symbol verify: "grep -r 'TargetName' src/ — if not found, stop and report"
2. File verify:   "ls path/to/file.ts — confirm it exists before editing"
3. Dependency verify: "cat package.json | grep 'packageName' — confirm installed"

Never:
- Reference a function, component, or type that isn't confirmed in the context
- Assume a package is installed without a check step
- Invent import paths — grep for the actual export location first
- Assume test, lint, or build commands — read package.json scripts first

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT STRUCTURE — all sessions must follow this format
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[THINKING HINT — first line, task-type specific, see below]
Context: <one paragraph — what, why, and the specific goal>
Steps:
1. <verb + exact target + expected outcome>
2. ...
Constraints:
- <one rule per line — from CLAUDE.md first, then universal rules>
Verification:
- <command → expected output> (binary, not subjective)

THINKING HINTS by task type (insert as the first line of content):
- REFACTOR, DEBUG_INVESTIGATION, DESIGN_DECISION:
    "Think through the full call graph / state flow before writing a single line of code."
- PERF_OPTIMIZATION:
    "Measure before optimizing — do not change code until you have profiling numbers."
- BUG_FIX:
    "Do not write any fix until you can reproduce the bug consistently."
- NEW_TOOL, DATA_INTEGRATION, NEW_FEATURE, CODE_REVIEW, DOC_OR_SPEC:
    (no thinking hint — action-first is correct for these)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOKEN EFFICIENCY — required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Steps must use exact commands with flags, not vague verbs:
  BAD:  "Install the required dependencies"
  GOOD: "npm install zod@3 — no other deps needed for this session"

Constraints must be one line each (not paragraphs):
  BAD:  "Make sure to use TypeScript strict mode and avoid using any..."
  GOOD: "TypeScript strict — no \`any\`, no non-null assertions"

Verification must be binary with expected output:
  BAD:  "Make sure all tests pass"
  GOOD: "npx vitest run → 0 failures"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOOK AND TOOLCHAIN AWARENESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If package.json is detected, include in each session's Steps (early):
- "cat package.json | grep -E '\"(test|lint|build|typecheck)\"' — note the exact commands"

Include in Constraints if any of these are likely present:
- Pre-commit hooks: "Run the full pre-commit hook before committing: npx lint-staged (or check .husky/pre-commit)"
- Type check: "npx tsc --noEmit must pass before every commit"
- Lint: "Run the project's lint command (from package.json scripts) — fix all warnings"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SESSION COUNT BY TASK TYPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEW_TOOL (2–4 sessions):
- Session 1: Scaffold — init, install deps, file structure, happy-path working end-to-end
- Session 2: Core features — read Session 1 files first, one feature at a time
- Session 3 (if needed): Error handling, edge cases, validation
- Session 4 (if needed): Tests, packaging, README
- generatedFiles: SPEC.md + CLAUDE.md tailored to the detected stack

NEW_FEATURE (1–2 sessions):
- Session 1: grep for reuse → design types → implement → integrate → test manually
- generatedFiles: empty unless a spec doc is warranted

BUG_FIX (1 session — diagnose first, then fix):
- reproduce → read relevant code → form hypothesis → confirm with targeted log/test →
  minimal fix → regression test (must fail before fix, pass after)
- generatedFiles: empty

CODE_REVIEW (1 session):
- Findings format: [SEVERITY] file:line — description. Suggested fix.
- Severity: BLOCKER / MAJOR / MINOR / NIT
- End with "Top 3 Blockers" section
- generatedFiles: empty

REFACTOR (2 sessions):
- Session 1: characterization tests only — NO CODE CHANGES
- Session 2: one change type per commit (rename OR extract OR move — never mixed)
- generatedFiles: empty

DEBUG_INVESTIGATION (1 session — no fixes):
- 2–3 hypotheses → cheapest test per hypothesis → confirm/rule out →
  report: root cause + evidence + recommended fix (do not implement)
- generatedFiles: empty

DESIGN_DECISION (1 session):
- 2–3 concrete options with pros/cons/failure modes/migration cost
- Concrete recommendation with 1-sentence rationale
- Include ready-to-paste implementation prompt for the chosen option
- generatedFiles: empty

PERF_OPTIMIZATION (2 sessions):
- Session 1: profile only — DevTools Network, Performance tab, bundle analyzer, measure baselines
- Session 2: fix only the 3 measured bottlenecks; one fix per commit with before/after numbers
- generatedFiles: empty

DATA_INTEGRATION (2 sessions):
- Session 1: TypeScript types first → mock data → UI against mock → [MOCK] badge visible
- Session 2: wire real API with MOCK_MODE flag, error handling, no credentials in code
- generatedFiles: empty

DOC_OR_SPEC (1 session):
- Audience: engineers new to the project
- Structure: Overview (≤200 words) → Quickstart (runnable example) →
  Configuration (all env vars/options) → Troubleshooting (top 3 failure modes + fixes)
- generatedFiles: the actual doc file (e.g. docs/feature-name.md)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNIVERSAL CONSTRAINTS (fallback when no CLAUDE.md detected)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Apply only if no project-specific rules were found:
- TypeScript strict — no \`any\`, no non-null assertions without explanation
- Zod at all external data boundaries (user input, API responses, env vars)
- Diagnose before mutate — grep/read before editing
- One concern per session — no mixed refactor + feature work
- npx tsc --noEmit must pass after every session
- No paid APIs — use ANTHROPIC_API_KEY env var for any AI features
- No hardcoded credentials — always env vars

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TITLE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Max 58 characters
- Imperative verb phrase: "Add dark mode toggle", "Fix CSV export crash"
- Specific enough to distinguish from other tasks in a list
- No trailing punctuation, no leading articles

Output only the JSON object now.`;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

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

// POST /api/generate — generate a structured task via Anthropic API
app.post('/api/generate', async (req, res) => {
  if (!anthropic) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set. Add it to your .env file.' });
  }

  const { input, projectPath, projectContext, taskType } = req.body;

  if (!input?.trim()) {
    return res.status(400).json({ error: 'input required' });
  }

  // Build known issues from past failures
  let knownIssuesBlock = '';
  if (taskType) {
    try {
      const failures = stmts.getFailuresByTaskType.all(taskType);
      if (failures.length > 0) {
        const notes = failures.map(f => `- ${f.notes}`).join('\n');
        knownIssuesBlock = `\nKNOWN ISSUES TO AVOID (${taskType}):\n${notes}`;
      }
    } catch {
      // non-blocking
    }
  }

  // Build structured project context block — explicit sections for grounding
  let contextBlock = '';
  if (projectContext) {
    const parts = [];

    if (projectContext.techStack?.length) {
      const pm = projectContext.packageMgr ? ` [package manager: ${projectContext.packageMgr}]` : '';
      parts.push(`TECH STACK: ${projectContext.techStack.join(', ')}${pm}`);
    }

    if (projectContext.scripts && Object.keys(projectContext.scripts).length > 0) {
      const cmds = Object.entries(projectContext.scripts).map(([k, v]) => `  ${k}: ${v}`).join('\n');
      parts.push(`PACKAGE.JSON SCRIPTS (use exact commands):\n${cmds}`);
    }

    if (projectContext.hooks?.length) {
      parts.push(`PRE-COMMIT HOOKS: ${projectContext.hooks.join(', ')} — include hook-run step before committing`);
    }

    if (projectContext.specPurpose) {
      parts.push(`SPEC PURPOSE: ${projectContext.specPurpose}`);
    }

    if (projectContext.rules?.length) {
      parts.push(`CLAUDE.md RULES (apply as hard constraints, these override defaults):\n${projectContext.rules.map(r => `- ${r}`).join('\n')}`);
    }

    const foundFiles = projectContext.keyFiles?.filter(f => f.found).map(f => f.filename);
    if (foundFiles?.length) {
      parts.push(`COMPANION FILES PRESENT: ${foundFiles.join(', ')}`);
    }

    if (projectContext.promptBlock) {
      const treeMatch = projectContext.promptBlock.match(/Directory structure.*?:\n([\s\S]+)$/i);
      if (treeMatch) parts.push(`DIRECTORY TREE (only reference paths from this tree):\n${treeMatch[1].trim()}`);
    }

    if (parts.length) {
      contextBlock = `\nPROJECT CONTEXT:\n${parts.join('\n\n')}`;
    }
  }

  const userMessage = [
    `TASK_TYPE: ${taskType || 'NEW_FEATURE'}`,
    `REQUEST: ${input.trim()}`,
    projectPath ? `PROJECT_PATH: ${projectPath}` : null,
    contextBlock || null,
    knownIssuesBlock || null,
  ].filter(Boolean).join('\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });

    // Adaptive thinking may prepend thinking blocks — find the text block
    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) {
      return res.status(500).json({ error: 'No text content in response' });
    }

    let parsed;
    try {
      const raw = textBlock.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      parsed = JSON.parse(raw);
    } catch {
      console.error('Non-JSON response (first 500 chars):', textBlock.text.slice(0, 500));
      return res.status(500).json({ error: 'Invalid JSON response from model' });
    }

    const now = new Date().toISOString();
    const task = {
      id:         `task-${uid()}`,
      title:      (parsed.title || input.trim().slice(0, 58)).replace(/[.!?]+$/, ''),
      input:      input.trim(),
      taskType:   taskType || 'NEW_FEATURE',
      projectPath: projectPath ?? undefined,
      status:     'pending',
      generatedPrompts: (parsed.generatedPrompts || []).map(p => ({ id: uid(), sessionLabel: p.sessionLabel, content: p.content })),
      generatedFiles:   (parsed.generatedFiles || []).map(f => ({ id: uid(), filename: f.filename, content: f.content })),
      generatedPlan:    (parsed.generatedPlan || []).map(s => ({ session: s.session, title: s.title, description: s.description, estimatedTime: s.estimatedTime })),
      generatedChecklist: parsed.generatedChecklist || [],
      createdAt:  now,
      updatedAt:  now,
    };

    // Persist to DB
    stmts.insertTask.run({
      id:                  task.id,
      title:               task.title,
      input:               task.input,
      task_type:           task.taskType,
      project_path:        task.projectPath ?? null,
      project_context:     projectContext ? JSON.stringify(projectContext) : null,
      status:              task.status,
      generated_prompts:   JSON.stringify(task.generatedPrompts),
      generated_files:     JSON.stringify(task.generatedFiles),
      generated_plan:      JSON.stringify(task.generatedPlan),
      generated_checklist: JSON.stringify(task.generatedChecklist),
      created_at:          task.createdAt,
      updated_at:          task.updatedAt,
    });

    res.json(task);
  } catch (err) {
    console.error('Anthropic API error:', err.message);
    res.status(500).json({ error: err.message || 'Generation failed' });
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
