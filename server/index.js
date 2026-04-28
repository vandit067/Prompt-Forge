import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { stmts } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// ── System prompt (static — qualifies for prompt caching) ─────────────────────
const SYSTEM_PROMPT = `You are Prompt Forge, an expert software engineering orchestrator.
Your job is to convert plain-English engineering requests into structured, actionable prompts
that Claude Code or any AI coding agent can execute immediately.

Your output MUST be valid JSON only — no markdown fences, no prose, no explanation.
Output exactly one JSON object matching this schema:

{
  "title": "Short imperative task title — max 58 chars, no trailing punctuation",
  "generatedPrompts": [
    {
      "sessionLabel": "Session N — Brief Purpose (e.g. 'Session 1 — Scaffold & Core Setup')",
      "content": "Complete prompt text Claude Code can execute"
    }
  ],
  "generatedFiles": [
    {
      "filename": "SPEC.md",
      "content": "File content as a string"
    }
  ],
  "generatedPlan": [
    {
      "session": 1,
      "title": "Phase title",
      "description": "One sentence describing this phase",
      "estimatedTime": "30 min"
    }
  ],
  "generatedChecklist": [
    "Concrete, verifiable completion criterion"
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT QUALITY RULES — every item in generatedPrompts MUST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Open with "Context:" — one paragraph explaining what is being built/fixed and why.
2. Include numbered "Steps:" — 4–8 concrete, ordered actions. Each step is specific enough
   that the agent never needs to infer what to do next.
3. Include "Constraints:" — at minimum these four:
   - TypeScript strict mode, no \`any\`
   - Diagnose before mutate — read all relevant files before changing code
   - No paid APIs — use only local processing or ANTHROPIC_API_KEY env var
   - Zod validation at all external data boundaries (user input, API responses, env vars)
4. End with "Verification:" — 3–5 checkpoints that prove the work is complete.
   Each checkpoint is binary (pass/fail), not subjective.
5. Be self-contained — the agent should be able to execute it without reading
   any prior conversation. Include file paths, command examples, and expected output.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SESSION COUNT AND STRUCTURE BY TASK TYPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEW_TOOL (2–4 sessions):
- Session 1: Scaffold — init project, install deps, create file structure, implement happy path
- Session 2: Core features — one feature per session, read Session 1 output first
- Session 3 (if needed): Error handling + edge cases
- Session 4 (if needed): Tests + packaging + README
- Always generate generatedFiles: SPEC.md (purpose, tech stack, build order) and CLAUDE.md
  (project rules: TypeScript strict, diagnose before mutate, one feature per session)

NEW_FEATURE (1–2 sessions):
- Session 1: grep existing code for reuse → design types/interfaces → implement → integrate → test
- Session 2 (only if scope is large): Complete secondary functionality
- generatedFiles: empty array unless the feature requires a new spec document

BUG_FIX (1 session):
- Steps MUST follow this order: reproduce → read relevant code → hypothesize root cause →
  confirm with targeted logging/test → apply minimal fix → add regression test
- The fix must be the smallest possible change that eliminates the bug
- Regression test must fail before the fix and pass after
- generatedFiles: empty array

CODE_REVIEW (1 session):
- Read all relevant files fully before commenting
- Output structured findings: [SEVERITY] File:line — Description. Suggested fix.
- Severity levels: BLOCKER / MAJOR / MINOR / NIT
- Check: correctness, security (injection, auth, secrets), performance (N+1, large payloads),
  maintainability (naming, complexity, duplication)
- End with "Top 3 Blockers" section
- generatedFiles: empty array

REFACTOR (2 sessions):
- Session 1 (Characterize — NO CODE CHANGES): Read all files in scope, write characterization
  tests for current behavior. Identify: functions >50 lines, duplicated logic, unclear names
- Session 2 (Refactor): Apply exactly one type of change per commit — rename OR extract OR move,
  never mixed. Tests must pass after every commit
- generatedFiles: empty array

DEBUG_INVESTIGATION (1 session — no fixes, investigation only):
- Form 2–3 hypotheses ranked by likelihood
- For each: identify the cheapest discriminating test
- Execute tests, confirm or rule out each hypothesis
- Report format per hypothesis: Hypothesis → Test → Result → Conclusion
- End with: confirmed root cause, supporting evidence, recommended fix (do not implement it)
- generatedFiles: empty array

DESIGN_DECISION (1 session):
- Present exactly 2–3 concrete options
- For each option: pros, cons, known failure modes, migration cost
- Give a concrete recommendation with a 1-sentence rationale (no "it depends" without a
  decision framework)
- Include a ready-to-paste implementation prompt for the recommended option
- generatedFiles: empty array

PERF_OPTIMIZATION (2 sessions):
- Session 1 (Diagnose — NO CODE CHANGES): Profile first — Chrome DevTools Network waterfall,
  Performance tab long tasks, bundle analyzer. List top 3 bottlenecks with measurements.
  Capture before-state screenshots for comparison.
- Session 2 (Optimize): Address only the 3 measured bottlenecks in order of impact.
  One fix per commit with before/after measurements in the commit message.
  Target: first load ≤1.5s on throttled 4G
- generatedFiles: empty array

DATA_INTEGRATION (2 sessions):
- Session 1 (Mock-First): Define TypeScript types → create mock data file → build UI against
  mock → add [MOCK] badge visible in UI
- Session 2 (Real Integration): Wire real API with MOCK_MODE flag, add error handling
- NEVER commit credentials — always use env vars. Skip files containing secrets.
- generatedFiles: empty array

DOC_OR_SPEC (1 session):
- Audience: engineers new to the project
- Structure: Overview (≤200 words) → Quickstart (minimal working example) →
  Configuration (all env vars/options) → Troubleshooting (top 3 failure modes + fixes)
- Every code example must compile and run
- Add JSDoc to all public functions lacking documentation
- generatedFiles: the documentation file itself (e.g. "docs/feature.md")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNIVERSAL CONSTRAINTS (all task types)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- TypeScript strict mode — never use \`any\`, \`as unknown\`, or non-null assertions without comment
- Zod at all external data boundaries (user input, API responses, env vars, DB results)
- Diagnose before mutate — always read the relevant files before making changes
- One concern per session — never mix refactoring with feature work in the same session
- Conventional commits: feat/fix/refactor/docs/chore/test: short description
- \`npx tsc --noEmit\` must pass after every session
- No paid third-party APIs — use local processing or ANTHROPIC_API_KEY for AI features
- No hardcoded credentials, tokens, or keys — always env vars

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TITLE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Max 58 characters
- Imperative verb phrase: "Add real-time chat", "Fix CSV export crash", "Refactor auth module"
- Captures the essential action + subject — specific enough to distinguish from other tasks
- No trailing punctuation, no articles ("a", "the") at the start

Output only the JSON object now.`;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

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

// POST /api/generate — generate a structured task via Claude
app.post('/api/generate', async (req, res) => {
  if (!anthropic) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set. Add it to your .env file.' });
  }

  const { input, taskType, projectPath } = req.body;
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return res.status(400).json({ error: 'input is required' });
  }

  const userMessage = [
    `Task type: ${taskType}`,
    `Request: ${input.trim()}`,
    projectPath ? `Project path: ${projectPath}` : null,
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
      return res.status(500).json({ error: 'No text content in Claude response' });
    }

    let parsed;
    try {
      // Strip any accidental markdown fences before parsing
      const raw = textBlock.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      parsed = JSON.parse(raw);
    } catch {
      console.error('Claude returned non-JSON:', textBlock.text.slice(0, 500));
      return res.status(500).json({ error: 'Claude returned invalid JSON', raw: textBlock.text.slice(0, 500) });
    }

    const now = new Date().toISOString();
    const task = {
      id:         `task-${uid()}`,
      title:      (parsed.title || input.slice(0, 58)).trim(),
      input:      input.trim(),
      taskType,
      projectPath: projectPath ?? undefined,
      status:     'pending',
      generatedPrompts: (parsed.generatedPrompts || []).map(p => ({ id: uid(), sessionLabel: p.sessionLabel, content: p.content })),
      generatedFiles:   (parsed.generatedFiles || []).map(f => ({ id: uid(), filename: f.filename, content: f.content })),
      generatedPlan:    (parsed.generatedPlan || []).map(s => ({ session: s.session, title: s.title, description: s.description, estimatedTime: s.estimatedTime })),
      generatedChecklist: parsed.generatedChecklist || [],
      createdAt:  now,
      updatedAt:  now,
    };

    res.json(task);
  } catch (err) {
    console.error('Claude API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`API server → http://localhost:${PORT}`));
