import type { Task, TaskType, GeneratedPrompt, GeneratedFile, PlanStep } from '../types';

export function classifyTask(input: string): TaskType {
  // Stack trace patterns take priority — detect before keyword matching
  if (
    /at\s+[\w.<>\[\] /]+\s+\(.*?:\d+:\d+\)/.test(input) ||   // JS/TS frame
    /Traceback \(most recent call last\):/.test(input) ||       // Python
    /at\s+[\w.$]+\.[\w$]+\([\w.]+:\d+\)/.test(input)          // JVM
  ) return 'BUG_FIX';

  const lower = input.toLowerCase();
  if (/\b(build|create|scaffold|make a tool|new app|new dashboard|new system|write a tool|build me)\b/.test(lower)) return 'NEW_TOOL';
  if (/\b(not working|broken|error|crash|bug|fix|fails|doesn'?t work|won'?t work|issue with|breaking)\b/.test(lower)) return 'BUG_FIX';
  if (/\b(review|is this good|check this|security audit|look at this code)\b/.test(lower)) return 'CODE_REVIEW';
  if (/\b(refactor|clean up|simplify|split|reorganize|restructure|improve the code)\b/.test(lower)) return 'REFACTOR';
  if (/\b(why does|how does|i don'?t understand|investigate|trace|what is causing)\b/.test(lower)) return 'DEBUG_INVESTIGATION';
  if (/\b(should i|best approach|which is better|versus|\bvs\b|options for|recommend a)\b/.test(lower)) return 'DESIGN_DECISION';
  if (/\b(slow|fast|performance|optimize|speed up|memory|throughput|latency|loading time)\b/.test(lower)) return 'PERF_OPTIMIZATION';
  if (/\b(connect to|pull data|fetch from|integrate with|api endpoint|database)\b/.test(lower)) return 'DATA_INTEGRATION';
  if (/\b(docs|documentation|readme|spec out|write a spec|document the|technical spec)\b/.test(lower)) return 'DOC_OR_SPEC';
  if (/\b(add|extend|integrate|implement|include|support for)\b/.test(lower)) return 'NEW_FEATURE';
  return 'NEW_FEATURE';
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function generateTitle(input: string): string {
  const first = input.split('\n')[0].trim();
  const sentence = first.split(/[.!?]/)[0].trim();
  const base = sentence.length > 4 ? sentence : first;
  return base.length > 58 ? base.slice(0, 55) + '…' : base;
}

export function generateFakeTask(input: string, projectPath?: string): Task {
  const taskType = classifyTask(input);
  const now = new Date().toISOString();

  return {
    id: `task-${uid()}`,
    title: generateTitle(input),
    input,
    taskType,
    projectPath,
    generatedPrompts: buildPrompts(input, taskType),
    generatedFiles: buildFiles(input, taskType),
    generatedPlan: buildPlan(taskType),
    generatedChecklist: buildChecklist(taskType),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

function buildPrompts(input: string, type: TaskType): GeneratedPrompt[] {
  const goal = input.length > 80 ? input.slice(0, 80) + '…' : input;

  switch (type) {
    case 'NEW_TOOL':
      return [
        {
          id: uid(),
          sessionLabel: 'Session 1 — Scaffold & Core Setup',
          content: `Role: Full-stack engineer building greenfield products

Context: ${goal}. Starting from scratch.

Goal: Complete a working scaffold with core happy-path functionality and zero TypeScript errors

---

Steps (in order):
1. Initialize project with appropriate scaffold (Vite/npm init/etc.)
2. Install core dependencies
3. Create entry point, main module, and types files
4. Implement the basic happy-path functionality
5. Test manually: verify the core function works end-to-end

Key Constraints (ordered by importance):
- [CRITICAL] TypeScript strict mode, no \`any\`
- [CRITICAL] Small commits per step — atomic changes only
- No paid APIs — all processing is local

Expected Output:
- Running dev server with zero TypeScript errors
- Core function works end-to-end with valid input
- 3-4 commits with clear messages following conventional commits

---

Verification Checklist:
□ Core feature works with valid input
□ npx tsc --noEmit → zero errors
□ Manual smoke test passes`,
        },
        {
          id: uid(),
          sessionLabel: 'Session 2 — Feature Completion',
          content: `Role: Feature engineer optimizing for correctness and testability

Context: Scaffold from Session 1 works. Now adding the remaining features for: ${goal}.

Goal: Implement all secondary features with comprehensive error handling and test coverage

---

Steps (in order):
1. Read every file created in Session 1 before making changes
2. Implement secondary features one at a time
3. Add error handling for edge cases (empty input, missing files, invalid types)
4. Write unit tests for the core logic
5. Update CLI/API interface to expose all functionality

Key Constraints (ordered by importance):
- [CRITICAL] Diagnose before mutate — read existing code first
- [CRITICAL] Zod validation at all user input boundaries
- Reuse existing utilities — never reinvent

Expected Output:
- All features working with valid input
- Edge cases handled with meaningful error messages
- Unit test suite with ≥ 80% coverage of core logic
- Updated interface documentation

---

Verification Checklist:
□ All features work with valid input
□ Edge cases handled gracefully
□ npm test → all tests pass
□ npx tsc --noEmit → zero errors`,
        },
      ];

    case 'BUG_FIX':
      return [
        {
          id: uid(),
          sessionLabel: 'Diagnose & Fix',
          content: `Role: Debugging specialist focused on root cause identification and minimal fixes

Context: ${goal}.

Goal: Identify the root cause and apply a targeted fix with a regression test, zero regressions

---

Steps (in order):
1. Read the relevant component/module and its dependencies — understand current behavior
2. Add targeted logging to reproduce the exact failure path
3. Identify root cause (state mutation, off-by-one, async race, wrong comparison, null dereference)
4. Apply the minimal targeted fix — do NOT refactor surrounding code
5. Add a regression test that would have caught this bug

Key Constraints (ordered by importance):
- [CRITICAL] Diagnose before mutate — no code changes in steps 1-2
- [CRITICAL] Fix only the broken path — no cleanup or refactoring in the same commit
- Regression test: must fail before fix, pass after

Expected Output:
- Clear explanation of the root cause with evidence
- Minimal fix (usually ≤ 5 lines changed)
- One regression test that fails before, passes after
- All existing tests still passing

---

Verification Checklist:
□ Original bug scenario no longer reproduces
□ Regression test passes
□ No other tests broke
□ npx tsc --noEmit → zero errors`,
        },
      ];

    case 'NEW_FEATURE':
      return [
        {
          id: uid(),
          sessionLabel: 'Session 1 — Implement Feature',
          content: `Role: Feature engineer optimizing for consistency and maintainability

Context: ${goal}.

Goal: Implement the feature following existing patterns, with all edge cases handled and tests passing

---

Steps (in order):
1. Grep for similar existing features/components — read them before writing anything
2. Design the data structure or component interface first (types + function signatures)
3. Implement the feature in isolation (new component/function/module)
4. Integrate with the existing system
5. Test the full flow manually

Key Constraints (ordered by importance):
- [CRITICAL] Reuse existing utilities — don't reinvent
- [CRITICAL] TypeScript strict, Zod at all data boundaries
- Update SPEC.md if the system shape changes

Expected Output:
- Feature works in the happy path
- Loading, error, and empty states all handled
- All existing tests still pass
- New tests if the feature is user-facing

---

Verification Checklist:
□ Feature works in the happy path
□ Loading, error, and empty states handled
□ Existing tests still pass
□ npx tsc --noEmit → zero errors`,
        },
      ];

    case 'CODE_REVIEW':
      return [
        {
          id: uid(),
          sessionLabel: 'Structured Code Review',
          content: `Role: Senior code reviewer focused on security, correctness, and maintainability

Context: Review requested — ${goal}.

Goal: Complete a structured security and correctness review with actionable findings, no BLOCKERS on merge

---

Steps (in order):
1. Read all relevant files fully before commenting
2. Correctness: does the code do what it claims? Are edge cases covered?
3. Security: input validation, SQL/command injection, secrets in code, auth checks
4. Performance: N+1 queries, large payloads, unnecessary re-renders, missing indexes
5. Maintainability: naming clarity, function length (<50 lines), duplication, complexity
6. Output structured review — one entry per finding

Key Constraints (ordered by importance):
- [CRITICAL] Flag any hardcoded secrets immediately as BLOCKER
- [CRITICAL] Blockers must include a specific suggested fix
- Focus on items that will cause production issues, not style

Expected Output:
- One review entry per finding with format: [SEVERITY] File:line — Description. Suggested fix.
- Severity levels: BLOCKER / MAJOR / MINOR / NIT
- "Top 3 Blockers" summary at the end
- "Approved" status if no BLOCKERS remain

---

Verification Checklist:
□ All BLOCKER findings addressed before merging
□ No hardcoded secrets in reviewed code
□ Top 3 blockers documented with fixes`,
        },
      ];

    case 'REFACTOR':
      return [
        {
          id: uid(),
          sessionLabel: 'Session 1 — Characterize & Add Tests',
          content: `Role: Refactoring specialist focused on structure, not behavior

Context: ${goal}.

Goal: Add characterization tests and make one structural improvement without changing behavior

---

Steps (in order):
1. Read all files in scope — write a 1-sentence description of each function/component
2. Identify: functions >50 lines, duplicated logic, unclear naming, mixed concerns
3. Write characterization tests for current behavior BEFORE any changes
4. Make one rename or extract (the safest change) — nothing else
5. Run tests to verify behavior unchanged

Key Constraints (ordered by importance):
- [CRITICAL] Tests must exist BEFORE any refactoring starts
- [CRITICAL] No behavior changes — structure only in this session
- One change type per commit: rename, extract, or move (not mixed)

Expected Output:
- Characterization tests for current behavior
- One refactoring commit (rename, extract, or move)
- All tests passing
- Before/after code complexity comparison

---

Verification Checklist:
□ All existing tests pass
□ Characterization tests pass
□ No observable behavior change
□ npx tsc --noEmit → zero errors`,
        },
      ];

    case 'DEBUG_INVESTIGATION':
      return [
        {
          id: uid(),
          sessionLabel: 'Investigate & Report',
          content: `Role: Debugging specialist focused on root cause investigation (not fixing)

Context: ${goal}.

Goal: Identify the root cause through systematic hypothesis testing with reproducible evidence

---

Steps (in order):
1. Collect observable data: error messages, stack traces, reproduction steps
2. Form 2-3 hypotheses ranked by likelihood
3. Identify the cheapest discriminating test for each hypothesis
4. Execute tests to confirm/rule out each hypothesis
5. Report: confirmed root cause, evidence, recommended fix

Key Constraints (ordered by importance):
- [CRITICAL] Don't implement a fix in this session — investigate only
- [CRITICAL] Each hypothesis must be testable (not "maybe it's a timing issue")
- Report format: Hypothesis → Test → Result → Conclusion

Expected Output:
- List of 2-3 hypotheses with likelihood ranking
- Test results for each hypothesis
- Confirmed root cause with supporting evidence
- Concrete recommended fix (don't implement it, just specify it)

---

Verification Checklist:
□ Root cause identified with supporting evidence
□ You can reproduce the issue consistently
□ Recommended fix is concrete and actionable`,
        },
      ];

    case 'DESIGN_DECISION':
      return [
        {
          id: uid(),
          sessionLabel: 'Trade-off Analysis & Recommendation',
          content: `Role: Architect making trade-off decisions with clear decision criteria

Context: Decision needed — ${goal}.

Goal: Recommend one option with clear trade-offs and a ready-to-use implementation prompt

---

Steps (in order):
1. Identify 2-3 concrete options
2. For each option, list: pros, cons, known failure modes, migration cost
3. State your recommendation with a 1-sentence rationale
4. Generate a ready-to-paste prompt for implementing the chosen option

Key Constraints (ordered by importance):
- [CRITICAL] Recommendation must be concrete — no "it depends" without a decision framework
- [CRITICAL] Consider: team familiarity, ecosystem maturity, bundle size, future flexibility
- All options must have concrete trade-offs, not marketing copy

Expected Output:
- 2-3 options with pros/cons/failure modes/migration cost per option
- Clear recommendation with 1-sentence rationale
- Ready-to-paste implementation prompt for the chosen option
- Decision framework explaining how to choose if requirements change

---

Verification Checklist:
□ All options have concrete trade-offs (not just marketing copy)
□ Recommendation is actionable
□ Implementation prompt for the chosen path is included`,
        },
      ];

    case 'PERF_OPTIMIZATION':
      return [
        {
          id: uid(),
          sessionLabel: 'Session 1 — Diagnose (no code changes)',
          content: `Role: Performance engineer focused on measurement before optimization

Context: ${goal}. Diagnose before optimizing.

Goal: Identify and quantify the top 3 bottlenecks with before-state measurements

---

Steps (in order):
1. Chrome DevTools → Network → disable cache → hard reload → screenshot waterfall
2. Mark the 3 largest requests and any sequential chains that could run in parallel
3. Performance tab → record 5s → screenshot long tasks (>50ms, shown red)
4. Run: npx vite-bundle-visualizer (or equivalent) → screenshot
5. Output: list of top 3 bottlenecks with sizes and timings

Key Constraints (ordered by importance):
- [CRITICAL] Do NOT change any code in this session — diagnose only
- [CRITICAL] Capture before-state screenshots for before/after comparison
- All measurements must be quantified (not "seems slow")

Expected Output:
- Network waterfall screenshot with 3 largest requests marked
- Performance profile screenshot showing long tasks
- Bundle size breakdown
- Prioritized bottleneck list with sizes and timings

---

Verification Checklist:
□ List of ≥ 3 bottlenecks with measurements exists
□ You can explain the critical path request chain`,
        },
        {
          id: uid(),
          sessionLabel: 'Session 2 — Targeted Optimization',
          content: `Role: Performance engineer fixing measured bottlenecks

Context: Bottlenecks from Session 1 identified. Now fixing them in order of impact.

Goal: Address top 3 bottlenecks with measurable improvement, zero regressions

---

Steps (in order):
1. Address bottleneck #1 (likely: large bundle or sequential requests)
   - Large bundle → React.lazy() + Suspense for heavy routes
   - Sequential fetches → Promise.all() or batched endpoint
2. Address bottleneck #2: add Cache-Control headers for static assets
3. Address bottleneck #3: lazy-load images below the fold
4. Re-run Lighthouse → compare to baseline

Key Constraints (ordered by importance):
- [CRITICAL] Only address measured bottlenecks — no speculative optimization
- [CRITICAL] One fix per commit with before/after measurements in the commit message
- Test the full user flow after each change to catch regressions

Expected Output:
- Updated performance waterfall showing improvements
- Before/after Lighthouse scores
- Commit messages with quantified improvements

---

Verification Checklist:
□ First load ≤ 1.5s on throttled 4G in Chrome DevTools
□ LCP score improved vs baseline
□ No regressions (test the full user flow after changes)`,
        },
      ];

    case 'DATA_INTEGRATION':
      return [
        {
          id: uid(),
          sessionLabel: 'Session 1 — Mock-First Integration',
          content: `Role: Full-stack engineer building UI-first with decoupled API

Context: ${goal}. Mock-first approach to decouple UI from API availability.

Goal: Build working UI with mock data, ready for real API wiring in Session 2

---

Steps (in order):
1. Define the data shape as TypeScript types first (before any API calls)
2. Create src/mocks/${uid()}.ts with realistic mock data matching the shape
3. Create src/services/dataService.ts with MOCK_MODE flag:
   if (MOCK_MODE) return mockData; else call the real API
4. Build the UI component against the mock data
5. Add [MOCK] badge visible in UI when MOCK_MODE is active

Key Constraints (ordered by importance):
- [CRITICAL] Never commit API keys or credentials — use env vars only
- [CRITICAL] MOCK_MODE=true by default until real API is ready
- Skip any scanned files containing credentials (flag them)

Expected Output:
- TypeScript types for the data shape
- Mock data file with realistic test data
- Data service with MOCK_MODE toggle
- UI component rendering mock data correctly

---

Verification Checklist:
□ UI renders correctly with mock data
□ [MOCK] badge visible
□ Switching MOCK_MODE=false calls the real endpoint
□ No credentials in version control`,
        },
      ];

    case 'DOC_OR_SPEC':
      return [
        {
          id: uid(),
          sessionLabel: 'Write Documentation',
          content: `Role: Technical writer making the subject understandable for newcomers

Context: ${goal}. Writing for engineers new to the project.

Goal: Create complete documentation so a new engineer can understand and use this in < 10 min

---

Steps (in order):
1. grep -r the subject across src/ to identify all relevant files
2. Identify: purpose, key components, configuration, common failure modes
3. Write docs/<subject>.md with:
   - Overview (≤ 200 words, what + why)
   - Quickstart (minimal working code example)
   - Configuration (all env vars / options with descriptions)
   - Troubleshooting (top 3 failure modes + fixes)
4. Add JSDoc to any public functions lacking documentation

Key Constraints (ordered by importance):
- [CRITICAL] Every code example must compile and run
- [CRITICAL] Audience: engineers new to the project (not domain experts)
- Keep overview ≤ 200 words; be ruthlessly concise

Expected Output:
- docs/<subject>.md with all 4 sections
- JSDoc comments on public functions
- Working code examples
- Troubleshooting guide

---

Verification Checklist:
□ New engineer can understand the subject in < 10 min
□ All code examples compile
□ Top 3 failure modes documented with fixes`,
        },
      ];
  }
}

function buildFiles(input: string, type: TaskType): GeneratedFile[] {
  if (type !== 'NEW_TOOL') return [];
  return [
    {
      id: uid(),
      filename: 'SPEC.md',
      content: `# ${input.slice(0, 55)}${input.length > 55 ? '…' : ''} — SPEC

## Purpose
${input}

## Tech Stack
- [Detect from package.json after Session 1]

## Build Order
1. Scaffold + core happy path
2. Feature completion
3. Error handling + edge cases
4. Tests + distribution`,
    },
    {
      id: uid(),
      filename: 'CLAUDE.md',
      content: `# CLAUDE.md

Read SPEC.md before any task.

## Rules
- TypeScript strict — no \`any\`
- Diagnose before mutate
- One feature per session
- No paid APIs`,
    },
  ];
}

function buildPlan(type: TaskType): PlanStep[] {
  switch (type) {
    case 'NEW_TOOL':
      return [
        { session: 1, title: 'Scaffold & Setup', description: 'Init project, install deps, core file structure', estimatedTime: '30 min' },
        { session: 2, title: 'Core Features', description: 'Primary functionality implementation', estimatedTime: '45 min' },
        { session: 3, title: 'Error Handling', description: 'Edge cases, validation, user-facing error messages', estimatedTime: '30 min' },
        { session: 4, title: 'Tests & Packaging', description: 'Unit tests, build config, README', estimatedTime: '30 min' },
      ];
    case 'BUG_FIX':
      return [{ session: 1, title: 'Diagnose & Fix', description: 'Root cause analysis, minimal fix, regression test', estimatedTime: '20-30 min' }];
    case 'NEW_FEATURE':
      return [{ session: 1, title: 'Implement Feature', description: 'Build, integrate, and test the feature', estimatedTime: '30-45 min' }];
    case 'REFACTOR':
      return [
        { session: 1, title: 'Characterize & Test', description: 'Map current behavior, write characterization tests', estimatedTime: '30 min' },
        { session: 2, title: 'Refactor', description: 'Rename, extract, simplify with tests as safety net', estimatedTime: '45 min' },
      ];
    case 'PERF_OPTIMIZATION':
      return [
        { session: 1, title: 'Diagnose', description: 'Network profiling, bundle analysis — no code changes', estimatedTime: '20 min' },
        { session: 2, title: 'Optimize', description: 'Address top 3 measured bottlenecks', estimatedTime: '45 min' },
      ];
    case 'DATA_INTEGRATION':
      return [
        { session: 1, title: 'Mock-First UI', description: 'Define types, build against mock data', estimatedTime: '30 min' },
        { session: 2, title: 'Real Integration', description: 'Wire real API, add error handling', estimatedTime: '30 min' },
      ];
    default:
      return [{ session: 1, title: 'Execute', description: 'Complete the task', estimatedTime: '30 min' }];
  }
}

function buildChecklist(type: TaskType): string[] {
  switch (type) {
    case 'NEW_TOOL':
      return [
        'Core command/function works with valid input',
        'Error cases handled gracefully (invalid input, missing files)',
        'npx tsc --noEmit → zero TypeScript errors',
        'npm test → all tests pass',
        'README updated with installation and usage',
      ];
    case 'BUG_FIX':
      return [
        'Original bug scenario no longer reproduces',
        'Regression test passes',
        'No other tests broke',
        'npx tsc --noEmit → zero errors',
      ];
    case 'NEW_FEATURE':
      return [
        'Feature works in the happy path',
        'Loading, error, and empty states handled',
        'Existing tests still pass',
        'npx tsc --noEmit → zero errors',
      ];
    case 'CODE_REVIEW':
      return [
        'All BLOCKER findings addressed before merging',
        'No hardcoded secrets in reviewed code',
        'Top 3 blockers documented with fixes',
      ];
    case 'REFACTOR':
      return [
        'All existing tests pass after refactor',
        'No observable behavior change',
        'Complexity reduced (fewer lines, clearer names)',
        'npx tsc --noEmit → zero errors',
      ];
    case 'PERF_OPTIMIZATION':
      return [
        'Before screenshot: Network waterfall baseline',
        'Before screenshot: Bundle visualizer baseline',
        'After: first load ≤ 1.5s on throttled 4G',
        'LCP improved vs Lighthouse baseline',
      ];
    default:
      return [
        'Implementation works as expected',
        'No regressions in related functionality',
        'npx tsc --noEmit → zero TypeScript errors',
      ];
  }
}
