import type { Task, TaskType, GeneratedPrompt, GeneratedFile, PlanStep } from '../types';

export function classifyTask(input: string): TaskType {
  // Stack trace patterns take priority — detect before keyword matching
  if (
    /at\s+[\w.<>\[\] /]+\s+\(.*?:\d+:\d+\)/.test(input) ||   // JS/TS frame
    /Traceback \(most recent call last\):/.test(input) ||       // Python
    /at\s+[\w.$]+\.[\w$]+\([\w.]+:\d+\)/.test(input)          // JVM
  ) return 'BUG_FIX';

  const lower = input.toLowerCase();
  if (/\b(security audit|security review|vulnerability|threat model|penetration|secure|authentication|authorization|encryption|xss|sql injection|csrf)\b/.test(lower)) return 'SECURITY_AUDIT';
  if (/\b(api design|api endpoint|rest api|graphql|schema|request|response format|api contract)\b/.test(lower)) return 'API_DESIGN';
  if (/\b(test strategy|testing approach|test plan|unit test|integration test|e2e test|coverage|test cases)\b/.test(lower)) return 'TEST_STRATEGY';
  if (/\b(architecture|system design|microservice|monolith|deployment|infrastructure|scalability|distributed)\b/.test(lower)) return 'ARCH_DECISION';
  if (/\b(monitoring|logging|metrics|alerting|observability|dashboard|tracing|apm)\b/.test(lower)) return 'MONITORING_SETUP';
  if (/\b(build|create|scaffold|make a tool|new app|new dashboard|new system|write a tool|build me)\b/.test(lower)) return 'NEW_TOOL';
  if (/\b(not working|broken|error|crash|bug|fix|fails|doesn'?t work|won'?t work|issue with|breaking)\b/.test(lower)) return 'BUG_FIX';
  if (/\b(review|is this good|check this|look at this code|code review)\b/.test(lower)) return 'CODE_REVIEW';
  if (/\b(refactor|clean up|simplify|split|reorganize|restructure|improve the code)\b/.test(lower)) return 'REFACTOR';
  if (/\b(why does|how does|i don'?t understand|investigate|trace|what is causing)\b/.test(lower)) return 'DEBUG_INVESTIGATION';
  if (/\b(should i|best approach|which is better|versus|\bvs\b|options for|recommend a)\b/.test(lower)) return 'DESIGN_DECISION';
  if (/\b(slow|fast|performance|optimize|speed up|memory|throughput|latency|loading time)\b/.test(lower)) return 'PERF_OPTIMIZATION';
  if (/\b(connect to|pull data|fetch from|integrate with|database|api)\b/.test(lower)) return 'DATA_INTEGRATION';
  if (/\b(docs|documentation|readme|spec out|write a spec|document the|technical spec)\b/.test(lower)) return 'DOC_OR_SPEC';
  if (/\b(add|extend|implement|include|support for|feature)\b/.test(lower)) return 'NEW_FEATURE';
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

    case 'API_DESIGN':
      return [
        {
          id: uid(),
          sessionLabel: 'Session 1 — API Design & Specification',
          content: `Role: API architect designing for clarity and scalability

Context: ${goal}.

Goal: Design complete API specification with endpoints, schemas, and error handling

---

Steps (in order):
1. Identify all resources and operations needed
2. Define endpoints with HTTP methods and paths
3. Define request/response schemas (with examples)
4. Design error responses (400, 401, 403, 404, 500, etc.)
5. Document rate limiting, pagination, authentication approach

Key Constraints (ordered by importance):
- [CRITICAL] RESTful principles or clear GraphQL structure
- [CRITICAL] All endpoints have clear request/response examples
- Version the API (v1, v2) from the start
- Document error codes with solutions

Expected Output:
- OpenAPI/Swagger spec (or detailed endpoint list)
- Request/response schema examples
- Error handling strategy
- Rate limiting & pagination policy

---

Verification Checklist:
□ All endpoints documented with methods, paths, schemas
□ Example requests and responses for each endpoint
□ Error handling for all failure cases
□ Authentication/authorization approach clear`,
        },
      ];

    case 'SECURITY_AUDIT':
      return [
        {
          id: uid(),
          sessionLabel: 'Session 1 — Security Review',
          content: `Role: Security specialist performing threat assessment

Context: ${goal}.

Goal: Complete security audit identifying risks and remediation steps

---

Steps (in order):
1. Identify assets and data sensitivity levels
2. List potential attack vectors (input validation, auth, injection, etc.)
3. Review code for OWASP Top 10 issues
4. Assess infrastructure/deployment security
5. Prioritize findings by severity and likelihood

Key Constraints (ordered by importance):
- [CRITICAL] Flag any secrets, API keys, or hardcoded credentials
- [CRITICAL] Rate findings by: Critical, High, Medium, Low
- Document proof-of-concept or reproduction for each finding
- Prioritize human factors (credentials in code > infrastructure)

Expected Output:
- List of findings with severity, description, and fix
- Risk prioritization matrix
- Immediate action items (fix now)
- Longer-term improvements
- Security testing recommendations

---

Verification Checklist:
□ No exposed secrets in analysis
□ All findings have clear remediation steps
□ Findings are reproducible
□ Risk prioritization is clear`,
        },
      ];

    case 'TEST_STRATEGY':
      return [
        {
          id: uid(),
          sessionLabel: 'Session 1 — Define Test Strategy',
          content: `Role: QA architect designing test coverage and approach

Context: ${goal}.

Goal: Define complete testing strategy with coverage targets and test plan

---

Steps (in order):
1. Identify critical paths (happy path, error cases, edge cases)
2. Define test pyramid: unit / integration / e2e ratio
3. List test scenarios for each critical path
4. Define coverage targets (aim for 70-80% coverage)
5. Plan test automation vs manual testing

Key Constraints (ordered by importance):
- [CRITICAL] Unit tests for business logic (>80% coverage)
- [CRITICAL] Integration tests for critical flows
- [CRITICAL] E2E tests for user workflows
- Manual testing for UX and edge cases

Expected Output:
- Test pyramid breakdown (unit: integration: e2e ratio)
- List of critical test scenarios
- Coverage targets by module
- Testing timeline and effort estimate
- Test automation roadmap

---

Verification Checklist:
□ All critical paths have test scenarios
□ Coverage targets are realistic
□ Test types (unit/integration/e2e) are balanced
□ Automation strategy is clear`,
        },
      ];

    case 'ARCH_DECISION':
      return [
        {
          id: uid(),
          sessionLabel: 'Session 1 — Architecture Design',
          content: `Role: Architect designing system structure and technology choices

Context: ${goal}.

Goal: Design system architecture with trade-off analysis and implementation roadmap

---

Steps (in order):
1. Identify system requirements (scalability, reliability, latency, cost)
2. Sketch 2-3 architectural options (monolith vs microservices, etc.)
3. For each option: pros, cons, failure modes, scaling limits
4. Technology choices: languages, databases, frameworks, infrastructure
5. Deployment strategy and operational requirements

Key Constraints (ordered by importance):
- [CRITICAL] Recommendation must fit team's expertise
- [CRITICAL] Document trade-offs clearly (no "it's better" without reasoning)
- Plan for failure modes: network partitions, cascading failures, data loss
- Cost analysis: infrastructure, operational overhead

Expected Output:
- Architecture diagram(s)
- Comparison of 2-3 options with trade-offs
- Selected architecture with rationale
- Technology stack justification
- Deployment and operational plan
- Scaling roadmap (how it grows)

---

Verification Checklist:
□ All options have documented trade-offs
□ Selected architecture fits requirements
□ Team has skills for chosen tech
□ Operational requirements are clear`,
        },
      ];

    case 'MONITORING_SETUP':
      return [
        {
          id: uid(),
          sessionLabel: 'Session 1 — Observability Design',
          content: `Role: DevOps/SRE engineer designing observability

Context: ${goal}.

Goal: Design complete monitoring, logging, and alerting strategy

---

Steps (in order):
1. Define key metrics: latency, throughput, error rate, resource usage
2. List critical alerts: when ops team should be paged
3. Design logging strategy: what to log, where, retention
4. Plan dashboards: for ops, for business, for developers
5. Define incident response process (detection → alert → remediation)

Key Constraints (ordered by importance):
- [CRITICAL] Alert on business impact (not noise)
- [CRITICAL] Metrics must be actionable (not just collection)
- Balance visibility with cost (storage, processing)
- Logs should answer: "what happened and why"

Expected Output:
- List of metrics to track with thresholds
- Alert rules with severity levels and escalation
- Logging schema and retention policy
- Dashboard design (what metrics, for whom)
- SLO/SLI definitions
- Incident response playbook (who, what, when)

---

Verification Checklist:
□ All critical paths have metrics
□ Alerts are actionable (not noise)
□ Logging captures failure scenarios
□ Dashboards answer "is everything okay?"`,
        },
      ];

    default:
      return [
        {
          id: uid(),
          sessionLabel: 'Execute Task',
          content: `Role: Focused executor

Context: ${goal}.

Goal: Complete the task with quality and clarity

---

Steps:
1. Understand requirements and constraints
2. Plan the approach
3. Execute the plan
4. Verify completion
5. Document results

---

Verification:
□ Task completed as specified
□ Quality standards met
□ Documentation updated`,
        },
      ];
  }
}

function buildClaudeFile(input: string, type: TaskType): GeneratedFile {
  return {
    id: uid(),
    filename: 'CLAUDE.md',
    content: `# CLAUDE.md — Workspace Rules

## Task
${input}

## Git Identity
- Author name: [Your Name]
- Author email: [your.email@example.com]
- Always use this identity for all commits

## Branch Naming
- Conventional prefixes: feature/, fix/, docs/, refactor/, chore/
- Never use "claude", "Claude", or "anthropic" in branch names
- Example: feature/orchestrator-dashboard-prototype

## Commit Messages
- Follow conventional commits format: \`type: short description\`
- Types: feat, fix, docs, refactor, chore, test, style
- Never mention "Claude" or "Anthropic" in messages
- Do NOT include session URLs in commit messages

## Development Rules
- TypeScript strict mode — no \`any\`
- Diagnose before mutate — read code before changing
- Small atomic commits — one change per commit
- Tests before refactoring — characterize behavior first
- No paid APIs — all processing is local
- Reuse existing utilities — don't reinvent

## Code Quality
- Function length < 50 lines
- One responsibility per function/component
- Clear naming over comments
- No half-finished implementations`,
  };
}

function buildGuardrailsFile(input: string, type: TaskType): GeneratedFile {
  let constraints = '';

  switch (type) {
    case 'NEW_TOOL':
      constraints = `## Constraints for Building New Tools

### [CRITICAL]
- TypeScript strict mode, no \`any\`
- Small commits per step — atomic changes only
- No paid APIs — all processing is local

### [HIGH]
- Diagnose before mutate
- Reuse existing utilities — don't reinvent
- Tests exist before feature completion

### [MEDIUM]
- One feature per commit
- Error handling for all edge cases
- Documentation updated alongside code`;
      break;

    case 'BUG_FIX':
      constraints = `## Constraints for Bug Fixes

### [CRITICAL]
- Diagnose before mutate — no code changes in first 2 steps
- Fix only the broken path — no cleanup or refactoring
- Regression test: must fail before fix, pass after
- No existing tests should break

### [HIGH]
- Root cause must be documented with evidence
- Minimal fix — usually ≤ 5 lines changed
- Commit message explains the root cause

### [MEDIUM]
- No speculative fixes
- Test the exact reproduction scenario
- Verify no side effects in related code`;
      break;

    case 'NEW_FEATURE':
      constraints = `## Constraints for New Features

### [CRITICAL]
- Reuse existing utilities — don't reinvent
- TypeScript strict, Zod at all data boundaries
- All states handled: happy path, loading, error, empty
- Existing tests must still pass

### [HIGH]
- Follow existing patterns and conventions
- Design interface/types before implementation
- Manual testing of full flow required

### [MEDIUM]
- Update SPEC.md if system shape changes
- Document new APIs with JSDoc
- New user-facing features need tests`;
      break;

    case 'BUG_FIX':
      constraints = `## Constraints for Bug Fixes

### [CRITICAL]
- Diagnose before mutate — no code changes in steps 1-2
- Fix only the broken path — no cleanup in same commit
- Regression test: must fail before fix, pass after

### [HIGH]
- Root cause must be identified with evidence
- Minimal fix — usually ≤ 5 lines changed
- No side effects in unrelated code

### [MEDIUM]
- Document the root cause in commit message
- Test exact reproduction scenario
- Verify existing tests still pass`;
      break;

    case 'CODE_REVIEW':
      constraints = `## Constraints for Code Reviews

### [CRITICAL]
- Flag hardcoded secrets immediately as BLOCKER
- Blockers must include specific suggested fix
- Focus on production issues, not style

### [HIGH]
- Read all relevant files before commenting
- Check: correctness, security, performance, maintainability
- One finding per entry with clear severity

### [MEDIUM]
- Security: input validation, injection, auth
- Performance: N+1 queries, re-renders, indexes
- No BLOCKERS = approved for merge`;
      break;

    case 'REFACTOR':
      constraints = `## Constraints for Refactoring

### [CRITICAL]
- Tests must exist BEFORE refactoring starts
- No behavior changes — structure only
- One change type per commit: rename, extract, or move

### [HIGH]
- Characterization tests written first
- All existing tests must pass
- No observable behavior change

### [MEDIUM]
- Simplify one thing at a time
- Document complex logic before refactoring
- Measure complexity reduction`;
      break;

    case 'DEBUG_INVESTIGATION':
      constraints = `## Constraints for Debug Investigation

### [CRITICAL]
- Don't implement a fix — investigate only
- Each hypothesis must be testable
- Report format: Hypothesis → Test → Result

### [HIGH]
- Form 2-3 hypotheses ranked by likelihood
- Execute discriminating tests for each
- Confirmed root cause with supporting evidence

### [MEDIUM]
- Collect observable data first
- Don't make speculative fixes
- Document reproduction steps`;
      break;

    case 'DESIGN_DECISION':
      constraints = `## Constraints for Design Decisions

### [CRITICAL]
- Recommendation must be concrete — no "it depends"
- All options must have concrete trade-offs
- Consider: team familiarity, maturity, bundle size

### [HIGH]
- Identify 2-3 concrete options
- List pros, cons, failure modes, migration cost
- Generate implementation prompt for chosen option

### [MEDIUM]
- Decision framework for future choices
- Known failure modes documented
- Migration path clear`;
      break;

    case 'PERF_OPTIMIZATION':
      constraints = `## Constraints for Performance Optimization

### [CRITICAL]
- Only address measured bottlenecks — no speculation
- Capture before-state screenshots
- One fix per commit with measurements

### [HIGH]
- Diagnose first session — no code changes
- Quantify all measurements
- Verify no regressions after optimization

### [MEDIUM]
- Test full user flow after changes
- Document before/after metrics
- Target: first load ≤ 1.5s on throttled 4G`;
      break;

    case 'DATA_INTEGRATION':
      constraints = `## Constraints for Data Integration

### [CRITICAL]
- Never commit API keys or credentials
- MOCK_MODE=true by default
- Use env vars only for secrets

### [HIGH]
- Define data shape as types first
- Build UI against mock data first
- Real API wiring in separate session

### [MEDIUM]
- [MOCK] badge visible when mocking
- All edge cases handled
- Error messages meaningful`;
      break;

    case 'DOC_OR_SPEC':
      constraints = `## Constraints for Documentation

### [CRITICAL]
- Every code example must compile and run
- Audience: engineers new to the project
- Keep overview ≤ 200 words

### [HIGH]
- Structure: Overview, Quickstart, Configuration, Troubleshooting
- All config options with descriptions
- Top 3 failure modes with fixes

### [MEDIUM]
- JSDoc on public functions
- Links to related docs
- Screenshots for visual topics`;
      break;

    case 'API_DESIGN':
      constraints = `## Constraints for API Design

### [CRITICAL]
- All endpoints documented with examples
- Request/response schemas are clear and complete
- Error responses documented (400, 401, 403, 404, 500, etc.)
- Backward compatibility strategy defined

### [HIGH]
- RESTful principles (or clear GraphQL structure)
- Version the API from the start (v1, v2)
- Rate limiting and pagination approach defined
- Authentication/authorization model clear

### [MEDIUM]
- Consistent naming conventions
- Idempotency for side effects
- Timestamp and versioning strategy
- Documentation is OpenAPI/Swagger compatible`;
      break;

    case 'SECURITY_AUDIT':
      constraints = `## Constraints for Security Audit

### [CRITICAL]
- Flag any exposed secrets, API keys, or credentials immediately
- All findings include proof-of-concept or reproduction steps
- Findings prioritized by severity: Critical > High > Medium > Low
- Each finding includes clear remediation steps

### [HIGH]
- Review for OWASP Top 10
- Assess authentication and authorization
- Check for injection vulnerabilities
- Verify data protection and encryption

### [MEDIUM]
- Document attack vectors and threats
- Risk assessment (likelihood × impact)
- Compliance considerations (GDPR, PCI-DSS, etc.)
- Security testing roadmap`;
      break;

    case 'TEST_STRATEGY':
      constraints = `## Constraints for Test Strategy

### [CRITICAL]
- Coverage targets realistic (70-80% for business logic)
- Critical paths have test scenarios
- Unit/integration/e2e balance defined
- Automation strategy clear

### [HIGH]
- All error cases have tests
- Performance tests for critical paths
- Flaky tests identified and addressed
- Test data and fixtures documented

### [MEDIUM]
- Testing timeline and effort estimates
- Manual testing approach for edge cases
- Regression test suite
- Test maintenance and updates plan`;
      break;

    case 'ARCH_DECISION':
      constraints = `## Constraints for Architecture Design

### [CRITICAL]
- Technology choices must fit team expertise
- Trade-offs documented clearly (not "it's better")
- Failure modes identified: network partitions, cascades, data loss
- Scaling strategy from day 1

### [HIGH]
- 2-3 options with pros/cons/costs
- Deployment and operational requirements clear
- Cost analysis: infrastructure and operational overhead
- Monitoring and observability built-in from start

### [MEDIUM]
- Database selection justified
- External service dependencies documented
- Migration path from legacy system
- Disaster recovery and backup strategy`;
      break;

    case 'MONITORING_SETUP':
      constraints = `## Constraints for Monitoring Setup

### [CRITICAL]
- Metrics are actionable (not just collected)
- Alerts focus on business impact, not noise
- Critical paths have health checks
- Logging captures failure scenarios

### [HIGH]
- SLO/SLI definitions for services
- Dashboard answers "is everything okay?"
- Incident response playbook exists
- On-call rotation and escalation clear

### [MEDIUM]
- Retention policies for logs and metrics
- Cost management (avoid log spam)
- Alerting thresholds tuned (not flaky)
- Performance impact of monitoring assessed`;
      break;

    default:
      constraints = `## General Development Constraints

### [CRITICAL]
- TypeScript strict mode
- Tests pass before merging
- No breaking changes without discussion

### [HIGH]
- Code follows project conventions
- Meaningful commit messages
- Documentation updated

### [MEDIUM]
- Performance impact assessed
- Edge cases considered
- Existing functionality preserved`;
  }

  return {
    id: uid(),
    filename: 'GUARDRAILS.md',
    content: `# GUARDRAILS.md — Do's and Don'ts

## Task
${input}

## Type: ${type}

${constraints}

## Universal Rules (all tasks)
- ✅ DO: Read existing code before making changes
- ✅ DO: Commit after each logical change
- ✅ DO: Test before considering work done
- ✅ DO: Ask questions if unclear
- ❌ DON'T: Refactor while fixing bugs
- ❌ DON'T: Add features while fixing bugs
- ❌ DON'T: Skip tests
- ❌ DON'T: Commit sensitive data

## Decision Framework
When uncertain about the right approach:
1. Does it match existing patterns in the codebase?
2. Is it the simplest solution that works?
3. Will it be maintainable 6 months from now?
4. Does it add unnecessary complexity?`,
  };
}

function buildFiles(input: string, type: TaskType): GeneratedFile[] {
  const files: GeneratedFile[] = [
    buildClaudeFile(input, type),
    buildGuardrailsFile(input, type),
  ];

  // Add SPEC.md only for NEW_TOOL
  if (type === 'NEW_TOOL') {
    files.push({
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
    });
  }

  return files;
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
    case 'API_DESIGN':
      return [
        { session: 1, title: 'Design & Spec', description: 'Define endpoints, schemas, error handling', estimatedTime: '45-60 min' },
        { session: 2, title: 'Documentation', description: 'Write OpenAPI spec, examples, API guide', estimatedTime: '30 min' },
      ];
    case 'SECURITY_AUDIT':
      return [
        { session: 1, title: 'Security Review', description: 'Threat assessment, vulnerability identification', estimatedTime: '60-90 min' },
        { session: 2, title: 'Remediation Plan', description: 'Prioritize findings, create fix roadmap', estimatedTime: '30 min' },
      ];
    case 'TEST_STRATEGY':
      return [
        { session: 1, title: 'Test Planning', description: 'Define coverage targets, test pyramid, scenarios', estimatedTime: '30-45 min' },
        { session: 2, title: 'Automation Setup', description: 'Implement test infrastructure, sample tests', estimatedTime: '45 min' },
      ];
    case 'ARCH_DECISION':
      return [
        { session: 1, title: 'Architecture Design', description: 'Compare options, select approach, design system', estimatedTime: '60-90 min' },
        { session: 2, title: 'Implementation Plan', description: 'Create phased roadmap, technology choices', estimatedTime: '30 min' },
      ];
    case 'MONITORING_SETUP':
      return [
        { session: 1, title: 'Observability Design', description: 'Define metrics, alerts, logging strategy', estimatedTime: '30-45 min' },
        { session: 2, title: 'Infrastructure Setup', description: 'Implement dashboards, alerts, playbooks', estimatedTime: '45 min' },
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
    case 'API_DESIGN':
      return [
        'All endpoints documented with examples',
        'Request and response schemas defined',
        'Error handling documented (400, 401, 403, 404, 500)',
        'OpenAPI/Swagger spec complete',
        'Authentication and authorization approach clear',
      ];
    case 'SECURITY_AUDIT':
      return [
        'No exposed secrets or API keys',
        'All findings documented with severity and fixes',
        'Critical findings have immediate remediation',
        'OWASP Top 10 reviewed',
        'Security testing roadmap defined',
      ];
    case 'TEST_STRATEGY':
      return [
        'Test pyramid defined (unit/integration/e2e ratio)',
        'Coverage targets set (70-80% minimum)',
        'Critical paths have test scenarios',
        'Automation strategy documented',
        'Testing timeline and effort estimated',
      ];
    case 'ARCH_DECISION':
      return [
        '2-3 options with trade-offs documented',
        'Selected architecture fits requirements',
        'Technology choices justified for team',
        'Deployment and operational plan clear',
        'Scaling roadmap defined',
      ];
    case 'MONITORING_SETUP':
      return [
        'Key metrics defined with thresholds',
        'Alert rules created (not noisy)',
        'Logging schema and retention defined',
        'Dashboards cover ops, business, development views',
        'SLO/SLI targets set',
      ];
    default:
      return [
        'Implementation works as expected',
        'No regressions in related functionality',
        'npx tsc --noEmit → zero TypeScript errors',
      ];
  }
}
