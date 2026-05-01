// Deterministic template-based generator — runs without any AI backend.
// Produces the same JSON schema as the Anthropic / Ollama paths.

const SESSION_COUNTS = {
  NEW_TOOL:            2,
  NEW_FEATURE:         1,
  BUG_FIX:             1,
  CODE_REVIEW:         1,
  REFACTOR:            2,
  DEBUG_INVESTIGATION: 1,
  DESIGN_DECISION:     1,
  PERF_OPTIMIZATION:   2,
  DATA_INTEGRATION:    2,
  DOC_OR_SPEC:         1,
};

const THINKING_HINTS = {
  REFACTOR:            'Think through the full call graph and state flow before writing a single line of code.',
  DEBUG_INVESTIGATION: 'Think through the full call graph and state flow before writing a single line of code.',
  DESIGN_DECISION:     'Think through the full call graph and state flow before writing a single line of code.',
  PERF_OPTIMIZATION:   'Measure before optimizing — do not change any code until you have profiling numbers.',
  BUG_FIX:             'Do not write any fix until you can reproduce the bug with a specific input or test case.',
};

const TASK_TIME = {
  NEW_TOOL:            '3–5 hours',
  NEW_FEATURE:         '2–4 hours',
  BUG_FIX:             '1–2 hours',
  CODE_REVIEW:         '1 hour',
  REFACTOR:            '2–3 hours',
  DEBUG_INVESTIGATION: '1–2 hours',
  DESIGN_DECISION:     '1 hour',
  PERF_OPTIMIZATION:   '2–3 hours',
  DATA_INTEGRATION:    '2–4 hours',
  DOC_OR_SPEC:         '1–2 hours',
};

const SCOPE_MAP = {
  NEW_TOOL:            'the new project directory only',
  NEW_FEATURE:         'only files directly integrating this feature and any new feature files',
  BUG_FIX:             'the minimum files needed to fix the root cause — no refactoring',
  CODE_REVIEW:         'only the files or PR under review — do not suggest out-of-scope rewrites',
  REFACTOR:            'explicitly listed files/modules only — do not touch callers',
  DEBUG_INVESTIGATION: 'read-only — produce a report, implement nothing',
  DESIGN_DECISION:     'analysis only — no code written',
  PERF_OPTIMIZATION:   'only the measured bottlenecks — no speculative optimization',
  DATA_INTEGRATION:    'new service layer and UI consuming it — no changes to unrelated UI',
  DOC_OR_SPEC:         'only documentation files — do not edit source code',
};

const ABORT_MAP = {
  NEW_TOOL:            'scaffold command fails or entry point does not run',
  NEW_FEATURE:         'existing tests break after integration',
  BUG_FIX:             'cannot reproduce after 2 attempts — report reproduction failure, stop',
  CODE_REVIEW:         'you cannot read a file — note it as unreviewed, continue with visible files',
  REFACTOR:            'any test fails after a commit — revert and investigate before next change',
  DEBUG_INVESTIGATION: 'you start wanting to fix something — investigation only, save fix for a BUG_FIX session',
  DESIGN_DECISION:     'you start writing implementation code — analysis only',
  PERF_OPTIMIZATION:   'you start editing code — stop, complete the profiling report first',
  DATA_INTEGRATION:    'you are about to write credentials or API keys into any file — use env vars only',
  DOC_OR_SPEC:         'you start editing source files — documentation only',
};

const SESSION_LABELS = {
  NEW_TOOL:            ['Session 1 — Scaffold & Happy Path', 'Session 2 — Core Features'],
  NEW_FEATURE:         ['Session 1 — Implement Feature'],
  BUG_FIX:             ['Session 1 — Reproduce & Fix'],
  CODE_REVIEW:         ['Session 1 — Review'],
  REFACTOR:            ['Session 1 — Characterization Tests', 'Session 2 — Apply Refactor'],
  DEBUG_INVESTIGATION: ['Session 1 — Investigate & Report'],
  DESIGN_DECISION:     ['Session 1 — Analyze Options & Recommend'],
  PERF_OPTIMIZATION:   ['Session 1 — Profile & Measure', 'Session 2 — Fix Bottlenecks'],
  DATA_INTEGRATION:    ['Session 1 — Types & Mock UI', 'Session 2 — Wire Real API'],
  DOC_OR_SPEC:         ['Session 1 — Write Documentation'],
};

function buildTitle(input) {
  let t = input.trim().replace(/[.!?]+$/, '').trim();
  if (t.length > 58) t = t.slice(0, 55) + '...';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function constraints(ctx) {
  const lines = [];
  if (ctx?.rules?.length) {
    for (const r of ctx.rules.slice(0, 6)) lines.push(r);
  }
  lines.push('TypeScript strict — no `any`, no non-null assertions without inline comment');
  lines.push('Run `npx tsc --noEmit` after every file change — fix errors before proceeding to the next step');
  return lines;
}

function verification(taskType, ctx) {
  const s = ctx?.scripts || {};
  const pm = ctx?.packageMgr || 'npm';
  const lines = [];
  if (s.typecheck)      lines.push(`${pm} run typecheck → 0 errors`);
  else if (s['type-check']) lines.push(`${pm} run type-check → 0 errors`);
  else                  lines.push('npx tsc --noEmit → 0 errors');
  if (s.lint)           lines.push(`${pm} run lint → 0 warnings`);
  if (s.test)           lines.push(`${pm} run test → all tests pass`);
  if (taskType === 'BUG_FIX') lines.push('regression test: fails before fix, passes after fix');
  return lines;
}

function buildSteps(taskType, ctx) {
  const pm = ctx?.packageMgr || 'npm';
  const scripts = ctx?.scripts || {};
  const testCmd = scripts.test ? `${pm} run test` : 'npx tsc --noEmit';
  const buildCmd = scripts.build ? `${pm} run build` : testCmd;

  switch (taskType) {
    case 'BUG_FIX':
      return [
        'Reproduce the bug with a specific input or failing test — do not proceed until reproduced',
        "grep -r '<relevant symbol>' src/ — confirm the suspected location",
        'Read the suspect file(s) — form a hypothesis before writing any code',
        'Write a regression test that fails before the fix',
        'Apply the minimal fix — verify the regression test now passes',
        `${testCmd} → all tests pass including the regression`,
      ];
    case 'CODE_REVIEW':
      return [
        'Read each changed file top to bottom',
        'Classify findings: [BLOCKER] / [MAJOR] / [MINOR] / [NIT] — format: "file:line — description. Suggested fix."',
        'Check for security issues: injection, auth bypass, unvalidated input',
        'Check for correctness: off-by-one, null handling, race conditions',
        'End with "Top 3 Blockers" summary',
      ];
    case 'DEBUG_INVESTIGATION':
      return [
        'State 2–3 hypotheses about the root cause',
        'For each hypothesis: design the cheapest confirming test',
        'Run tests in order — stop when one is confirmed',
        'Write report: hypothesis → test → result → conclusion',
        'End with confirmed root cause + recommended fix session',
      ];
    case 'DESIGN_DECISION':
      return [
        'Define decision criteria (performance, maintainability, migration cost)',
        'Present 2–3 concrete options with pros, cons, and failure modes',
        'Make a concrete recommendation with 1-sentence rationale — no "it depends" without a decision framework',
        'Output a ready-to-paste implementation prompt for the chosen option',
      ];
    case 'PERF_OPTIMIZATION':
      return [
        'Open DevTools Network + Performance tabs — record baseline numbers before any change',
        'Identify top 3 bottlenecks by measured impact',
        'STOP — do not edit any code in this session',
        'Write profiling report: metric → baseline → bottleneck → expected improvement',
      ];
    case 'DOC_OR_SPEC':
      return [
        'Read existing source code to extract accurate information — do not invent behavior',
        'Write Overview (≤200 words)',
        'Write Quickstart (runnable example with exact commands)',
        'Write Config section (all env vars with type and default)',
        'Write Troubleshooting (top 3 failure modes + fixes)',
      ];
    case 'REFACTOR':
      return [
        'Run the test suite — confirm all tests pass before any code change',
        'Write characterization tests for every public behavior of the target module',
        `${testCmd} → all characterization tests pass`,
        'STOP — do not modify any implementation code in this session',
        'Write HANDOFF NOTE with: test file location, all covered behaviors, known edge cases',
      ];
    case 'DATA_INTEGRATION':
      return [
        "grep -r '<API or data source name>' src/ — confirm no duplicate integration exists",
        'Define TypeScript types for the data shape',
        'Create mock data file at src/mocks/<feature>.ts',
        'Build UI components consuming the mock — add [MOCK] badge visible when mock data is active',
        `${buildCmd} → no errors`,
      ];
    default:
      return [
        "grep -r '<key symbol>' src/ — confirm expected structure exists before writing",
        'Read 2 existing similar files to understand naming and import conventions',
        'Implement the change following existing patterns — no new abstractions if existing ones cover the case',
        'Integrate with existing code',
        `${testCmd} → no failures`,
      ];
  }
}

function buildSession2Steps(taskType, ctx) {
  const pm = ctx?.packageMgr || 'npm';
  const scripts = ctx?.scripts || {};
  const testCmd = scripts.test ? `${pm} run test` : 'npx tsc --noEmit';

  switch (taskType) {
    case 'NEW_TOOL':
      return [
        'Read HANDOFF NOTE from Session 1 — verify scaffolded state before proceeding',
        'Implement each core feature one at a time — commit after each feature',
        'Add error handling for expected failure modes',
        `${testCmd} → all tests pass`,
      ];
    case 'REFACTOR':
      return [
        'Read Session 1 HANDOFF NOTE — verify characterization tests are in place',
        'Apply ONE change type per commit: rename OR extract OR move — never mixed',
        `After each commit: ${testCmd} → must pass before the next change`,
        'If any test fails after a commit: revert and investigate before proceeding',
      ];
    case 'PERF_OPTIMIZATION':
      return [
        'Read Session 1 profiling report — confirm baseline numbers',
        'Fix bottleneck #1 — measure after: must beat baseline; note before/after in commit message',
        'Fix bottleneck #2 — measure after: must beat baseline; note before/after in commit message',
        'Fix bottleneck #3 — measure after: must beat baseline; note before/after in commit message',
      ];
    case 'DATA_INTEGRATION':
      return [
        'Read Session 1 HANDOFF NOTE — confirm mock data and types are in place',
        'Add MOCK_MODE env var check — when true, use mock data',
        'Implement real API call in service layer — use env vars for all credentials',
        'Add loading, error, and empty states',
        'Remove [MOCK] badge when real data loads successfully',
      ];
    default:
      return [
        'Read Session 1 HANDOFF NOTE — verify state before proceeding',
        'Handle edge cases and secondary functionality',
        'Add polish and error handling',
        `${testCmd} → all tests pass`,
      ];
  }
}

function buildSessionContent(input, taskType, ctx, sessionIndex) {
  const hint = THINKING_HINTS[taskType];
  const scope = SCOPE_MAP[taskType] || 'files directly required by the task';
  const abort = ABORT_MAP[taskType] || 'required file does not exist and cannot be located';
  const c = constraints(ctx);
  const v = verification(taskType, ctx);
  const steps = sessionIndex === 0
    ? buildSteps(taskType, ctx)
    : buildSession2Steps(taskType, ctx);

  const lines = [];
  if (hint) lines.push(hint);

  lines.push(sessionIndex === 0
    ? `Context: ${input.trim()}`
    : `Context: Session 1 established the foundation for: ${input.trim().slice(0, 80)}`
  );

  lines.push(`Scope: ONLY modify ${scope}. Flag but do not fix anything outside scope.`);
  lines.push('Steps:');
  steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));

  lines.push('Guardrails:');
  lines.push(`- STOP and report if: ${abort}`);
  lines.push('- Never: modify more than 5 files for a single step — decompose first; use --no-verify on git hooks');

  lines.push('Constraints:');
  c.forEach(r => lines.push(`- ${r}`));

  lines.push('Verification:');
  v.forEach(r => lines.push(`- ${r}`));

  return lines.join('\n');
}

function buildPlanDesc(taskType, sessionIndex, input) {
  const descs = [
    {
      NEW_TOOL:            'Scaffold the project, install dependencies, verify the happy path end-to-end',
      NEW_FEATURE:         `Implement: ${input.slice(0, 80)}`,
      BUG_FIX:             'Reproduce, locate root cause, apply minimal fix, add regression test',
      CODE_REVIEW:         'Review all changed files, classify findings by severity, produce Top 3 Blockers',
      REFACTOR:            'Add characterization tests to lock in current behavior before any code changes',
      DEBUG_INVESTIGATION: 'Form hypotheses, run cheapest confirming tests, produce root-cause report',
      DESIGN_DECISION:     'Evaluate 2–3 options, recommend with rationale, produce implementation prompt',
      PERF_OPTIMIZATION:   'Profile the application and identify the top 3 bottlenecks — no code changes',
      DATA_INTEGRATION:    'Define TypeScript types, build mock data, connect UI to mock with [MOCK] badge',
      DOC_OR_SPEC:         'Write complete documentation: Overview, Quickstart, Config, Troubleshooting',
    },
    {
      NEW_TOOL:            'Implement core features one at a time, add error handling, run all tests',
      NEW_FEATURE:         'Handle edge cases, add polish, ensure all tests pass',
      REFACTOR:            'Apply one change type per commit: rename OR extract OR move — never mixed',
      PERF_OPTIMIZATION:   'Fix top 3 bottlenecks in order of impact, one fix per commit with before/after numbers',
      DATA_INTEGRATION:    'Wire real API behind MOCK_MODE flag, add error states, remove [MOCK] badge',
    },
  ];
  return descs[sessionIndex]?.[taskType] ?? (sessionIndex === 0 ? 'Implement the requested change' : 'Complete remaining work from session 1');
}

function buildChecklist(taskType, ctx) {
  const s = ctx?.scripts || {};
  const pm = ctx?.packageMgr || 'npm';
  const items = [];

  if (s.typecheck)          items.push(`${pm} run typecheck → 0 errors`);
  else if (s['type-check']) items.push(`${pm} run type-check → 0 errors`);
  else                      items.push('npx tsc --noEmit → 0 errors');

  if (s.lint)   items.push(`${pm} run lint → 0 warnings`);
  if (s.test)   items.push(`${pm} run test → all tests pass`);
  if (s.build)  items.push(`${pm} run build → no build errors`);

  if (taskType === 'BUG_FIX')          items.push('regression test: fails before fix, passes after fix');
  if (taskType === 'DATA_INTEGRATION') items.push('MOCK_MODE=true → [MOCK] badge visible; MOCK_MODE=false → real data loads');
  if (taskType === 'PERF_OPTIMIZATION') items.push('profiling report: baseline numbers recorded for all 3 bottlenecks');
  if (taskType === 'CODE_REVIEW')      items.push('review complete: all files read, Top 3 Blockers identified');

  items.push('git status → no unintended files staged');
  return items;
}

function buildNewToolFiles(input, ctx) {
  const stack = ctx?.techStack?.join(', ') || 'Node.js';
  const pm = ctx?.packageMgr || 'npm';

  return [
    {
      filename: 'SPEC.md',
      content: `# SPEC.md\n\n## Purpose\n${input.trim()}\n\n## Tech Stack\n${stack}\n\n## Package Manager\n${pm}\n\n## Key Commands\n- Install: \`${pm} install\`\n- Dev: \`${pm} run dev\`\n- Test: \`${pm} run test\`\n- Build: \`${pm} run build\`\n\n## Architecture\n[To be filled in after scaffolding]\n\n## API / Interface\n[To be filled in after design]\n`,
    },
    {
      filename: 'CLAUDE.md',
      content: `# CLAUDE.md\n\n## Rules\n- TypeScript strict — no \`any\`, no non-null assertions without inline comment\n- Zod at all external data boundaries (user input, API responses, env vars)\n- One concern per session — no mixed refactor + feature work\n- Diagnose before mutate — grep/read before editing\n- No hardcoded credentials — always env vars\n\n## Commands\n- Install: ${pm} install\n- Dev: ${pm} run dev\n- Test: ${pm} run test\n- Build: ${pm} run build\n- Type check: npx tsc --noEmit\n`,
    },
  ];
}

export function generateFromScript(input, taskType, projectContext) {
  const type = taskType || 'NEW_FEATURE';
  const count = SESSION_COUNTS[type] ?? 1;
  const title = buildTitle(input);
  const labels = SESSION_LABELS[type] || [`Session 1 — Implement`];

  const generatedPrompts = [];
  for (let i = 0; i < count; i++) {
    let content = buildSessionContent(input, type, projectContext, i);

    // Append HANDOFF NOTE to all non-final sessions of multi-session tasks
    if (i < count - 1) {
      content += `\nHANDOFF NOTE:\n- Completed: <fill in after completing this session>\n- State: <one sentence describing what the next agent will find>\n- Next session starts at: ${labels[i + 1] || `Session ${i + 2}`}\n- Caution: <any warnings for the next agent>`;
    }

    generatedPrompts.push({ sessionLabel: labels[i] ?? `Session ${i + 1}`, content });
  }

  const generatedPlan = generatedPrompts.map((p, i) => ({
    session: i + 1,
    title: p.sessionLabel.replace(/^Session \d+ — /, ''),
    description: buildPlanDesc(type, i, input.trim()),
    estimatedTime: TASK_TIME[type] || '2 hours',
  }));

  const generatedChecklist = buildChecklist(type, projectContext);
  const generatedFiles = type === 'NEW_TOOL' ? buildNewToolFiles(input, projectContext) : [];

  return { title, generatedPrompts, generatedFiles, generatedPlan, generatedChecklist };
}
