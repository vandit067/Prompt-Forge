import type { Task } from '../types';

export const MOCK_TASKS: Task[] = [
  {
    id: 'task-001',
    input: 'Build a CLI tool that converts Markdown files to PDF with custom themes',
    taskType: 'NEW_TOOL',
    status: 'success',
    createdAt: '2026-04-19T14:30:00Z',
    updatedAt: '2026-04-19T14:32:00Z',
    generatedPrompts: [
      {
        id: 'p001-1',
        sessionLabel: 'Session 1 — Scaffold & Basic Conversion',
        content: `Context: Building a Markdown-to-PDF CLI tool from scratch. Node.js + TypeScript.

Steps:
1. Run: mkdir md-to-pdf && cd md-to-pdf && npm init -y
2. Install: npm install commander marked puppeteer chalk && npm install -D typescript @types/node ts-node
3. Create src/cli.ts with Commander.js — add convert <input> <output> command
4. Create src/converter.ts: readFile → marked(content) → puppeteer.launch() → page.pdf()
5. Add "bin" entry in package.json and test: npx ts-node src/cli.ts convert README.md out.pdf

Constraints:
- TypeScript strict mode, no \`any\`
- No paid APIs — Puppeteer runs fully local
- Never write outside the output path argument

Verification:
- npx ts-node src/cli.ts convert README.md test.pdf
- Open test.pdf in your viewer — headings, paragraphs, code blocks visible
- npx tsc --noEmit → zero errors`,
      },
      {
        id: 'p001-2',
        sessionLabel: 'Session 2 — Theme System',
        content: `Context: Basic converter from Session 1 works. Now adding swappable CSS themes.

Steps:
1. Read src/converter.ts to understand how HTML is passed to Puppeteer
2. Create src/themes/ with: default.css, minimal.css, academic.css
3. Each CSS file must define: body, h1-h6, code, pre, table, blockquote
4. Add --theme <name> flag to Commander in src/cli.ts (default: "default")
5. Update converter.ts: load theme CSS via fs.readFileSync, inject into page.setContent()
6. Add themes list subcommand: prints available theme names

Constraints:
- Never inline CSS in TypeScript — always read from .css files
- Unknown theme → print error with available options, exit code 1

Verification:
- npx ts-node src/cli.ts convert sample.md out.pdf --theme minimal → different styling
- npx ts-node src/cli.ts themes list → prints: default, minimal, academic`,
      },
      {
        id: 'p001-3',
        sessionLabel: 'Session 3 — Batch Processing',
        content: `Context: Single-file conversion + themes working. Adding batch directory processing.

Steps:
1. Read src/cli.ts and src/converter.ts
2. Add batch <inputDir> <outputDir> command to Commander
3. In converter.ts: fs.readdirSync(inputDir) → filter .md → Promise.all(convert each)
4. Progress: chalk output "Converting [3/10]: intro.md..."
5. Add --concurrency <n> flag (default: 3) to cap parallel Puppeteer instances
6. Summary on finish: "✓ 9 converted, ✗ 1 failed"

Constraints:
- Create outputDir if it doesn't exist: fs.mkdirSync(outputDir, { recursive: true })
- Failures log error and continue — never throw on batch

Verification:
- Create test-docs/ with 3 .md files, run batch command → 3 PDFs in output/
- Invalid .md file → others still convert, failure printed at end`,
      },
    ],
    generatedFiles: [
      {
        id: 'f001-spec',
        filename: 'SPEC.md',
        content: `# MD-to-PDF CLI — SPEC

## Purpose
Convert Markdown files to styled PDF documents with swappable CSS themes, via CLI.

## Tech Stack
- Node.js 20 + TypeScript 5 (strict)
- Commander.js — CLI argument parsing
- Marked — Markdown → HTML
- Puppeteer — HTML → PDF (local, no paid APIs)
- Chalk — terminal output

## Commands
\`\`\`
convert <input.md> <output.pdf> [--theme default|minimal|academic]
batch <inputDir/> <outputDir/> [--theme <name>] [--concurrency 3]
themes list
\`\`\`

## Build Order
1. Scaffold + basic single-file conversion
2. Theme system (CSS templates)
3. Batch processing with concurrency control
4. Watch mode (auto-convert on save)
5. npm publish`,
      },
      {
        id: 'f001-claude',
        filename: 'CLAUDE.md',
        content: `# CLAUDE.md — MD-to-PDF Rules

Read SPEC.md before any task.

## Rules
- TypeScript strict — no \`any\`
- Diagnose before mutate
- One feature per session
- No paid APIs, no cloud services
- Never write outside the output path argument

## Structure
\`\`\`
src/
  cli.ts        # Commander setup + commands
  converter.ts  # Core conversion logic
  themes/       # CSS theme files
\`\`\``,
      },
    ],
    generatedPlan: [
      { session: 1, title: 'Scaffold & Basic Conversion', description: 'Project init, deps, single .md → .pdf via Puppeteer', estimatedTime: '30 min' },
      { session: 2, title: 'Theme System', description: 'CSS templates, --theme flag, themes list command', estimatedTime: '40 min' },
      { session: 3, title: 'Batch Processing', description: 'Directory conversion, concurrency, progress output', estimatedTime: '35 min' },
    ],
    generatedChecklist: [
      'npx ts-node src/cli.ts convert README.md test.pdf → PDF is created',
      'PDF opens with correct formatting (headings, code blocks, tables)',
      'npx ts-node src/cli.ts convert README.md out.pdf --theme minimal → distinct style',
      'npx ts-node src/cli.ts themes list → prints: default, minimal, academic',
      'npx ts-node src/cli.ts batch docs/ out/ → all .md files converted',
      'Unknown theme → error message with available options, exit code 1',
      'npx tsc --noEmit → zero TypeScript errors',
    ],
  },
  {
    id: 'task-002',
    input: "The search filter in my task list doesn't reset when the input is cleared",
    taskType: 'BUG_FIX',
    status: 'error',
    errorNotes: 'The fix suggested mutating state directly instead of using the useState setter, which created more downstream issues. Need to strictly use setState with empty string, not null.',
    createdAt: '2026-04-19T10:15:00Z',
    updatedAt: '2026-04-19T11:00:00Z',
    generatedPrompts: [
      {
        id: 'p002-1',
        sessionLabel: 'Diagnose & Fix — Search Filter Reset',
        content: `Context: Search filter works for filtering, but doesn't reset when input is cleared.

Steps:
1. Read TaskList.tsx and its parent component — understand state flow
2. Add console.log(searchQuery) on every onChange to trace exact state during clear
3. Check: does the clear path use setState('') vs setState(null/undefined)?
4. Check: does the input have value={searchQuery} (controlled) or no value prop (uncontrolled)?
5. If uncontrolled → add value={searchQuery} to make it controlled
6. If null/undefined on clear → change to empty string ''

Constraints:
- Never mutate state directly — use the useState setter only
- Reset value must be '' (empty string), not null or undefined
- Do NOT refactor surrounding code — fix only the reset path

Verification:
- Type "test" → list filters to matching items
- Delete all chars → full list restores immediately
- React DevTools: searchQuery shows "" (not null) when input is empty`,
      },
    ],
    generatedFiles: [],
    generatedPlan: [
      { session: 1, title: 'Diagnose & Fix', description: 'Root cause filter reset bug, minimal targeted fix', estimatedTime: '20 min' },
    ],
    generatedChecklist: [
      'Type in search box → list filters correctly',
      'Clear all text → full list restores immediately',
      'React DevTools shows searchQuery as "" when empty (not null)',
      'npx tsc --noEmit → zero errors',
    ],
  },
  {
    id: 'task-003',
    input: 'Add dark mode toggle to the settings panel with localStorage persistence',
    taskType: 'NEW_FEATURE',
    status: 'success',
    createdAt: '2026-04-18T16:45:00Z',
    updatedAt: '2026-04-18T17:30:00Z',
    generatedPrompts: [
      {
        id: 'p003-1',
        sessionLabel: 'Dark Mode Toggle + Persistence',
        content: `Context: Adding dark/light mode toggle to Settings panel with cross-reload persistence.

Steps:
1. Read Settings.tsx, App.tsx, and tailwind.config.js
2. Add darkMode: 'class' to tailwind.config.js if not present
3. Create src/hooks/useTheme.ts:
   - Init: read localStorage.getItem('theme'), fall back to prefers-color-scheme
   - setTheme: update localStorage + toggle class on document.documentElement
4. Call useTheme() at root App.tsx level
5. Add toggle switch to Settings.tsx with label "Dark Mode" / "Light Mode"
6. Add inline script in index.html <head> to apply theme before React renders (no flash)

Constraints:
- Set class on document.documentElement (html), not body
- Default to system preference when no localStorage value
- No flash on load — the inline script in <head> is required

Verification:
- Toggle dark/light in Settings → immediate color change
- Reload page → preference persists
- Open incognito → defaults to system color scheme
- No white flash before theme applies`,
      },
    ],
    generatedFiles: [],
    generatedPlan: [
      { session: 1, title: 'Dark Mode Toggle', description: 'Tailwind dark class, useTheme hook, Settings toggle, no-flash persistence', estimatedTime: '25 min' },
    ],
    generatedChecklist: [
      'Settings toggle switches theme immediately',
      'Reload → preference persists (check localStorage in DevTools)',
      'Incognito tab → defaults to system color scheme',
      'No white flash before theme applies on load',
    ],
  },
  {
    id: 'task-004',
    input: 'Should I use Zustand or Jotai for global state in my React app?',
    taskType: 'DESIGN_DECISION',
    status: 'pending',
    createdAt: '2026-04-20T09:00:00Z',
    updatedAt: '2026-04-20T09:00:00Z',
    generatedPrompts: [
      {
        id: 'p004-1',
        sessionLabel: 'Design Decision — Zustand vs Jotai',
        content: `Context: Choosing a global state library for a React app.

Trade-off Analysis:

Zustand — store-centric
+ Single store with slices: easy to trace state flow
+ Excellent DevTools via zustand/middleware (devtools, persist)
+ Great for cross-cutting business logic: auth, cart, app config
- More boilerplate for many small independent state slices

Jotai — atom-centric
+ Ultra-granular: components re-render only when their atom changes
+ Zero-config, works without providers in most cases
+ Best for many small independent UI atoms (modal open, per-row edit)
- Harder to trace global state flow in large apps

Recommendation: Use Zustand if your state is mostly business logic
(user session, settings, cart). Use Jotai if you have many small UI
atoms and need minimal re-renders as the primary concern.

Steps (Zustand path):
1. npm install zustand
2. Create src/store/useAppStore.ts with create() + devtools middleware
3. Add slices for auth, settings, any shared UI state
4. Migrate useState calls that are prop-drilled 3+ levels deep

Constraints:
- Store files in src/store/ only
- Never import store directly in UI components — create selector hooks
- Add devtools middleware for debugging

Verification:
- Redux DevTools shows state updates
- React Profiler: no unnecessary re-renders from unrelated state changes`,
      },
    ],
    generatedFiles: [],
    generatedPlan: [
      { session: 1, title: 'Implement Chosen Library', description: 'Install, configure, migrate top 3 prop-drilled state pieces', estimatedTime: '45 min' },
    ],
    generatedChecklist: [
      'State visible in React DevTools / Redux DevTools',
      'Components only re-render when their relevant state changes',
      'No direct localStorage access in components (goes through store)',
      'npx tsc --noEmit → zero errors',
    ],
  },
  {
    id: 'task-005',
    input: 'Dashboard first load is taking 3-4 seconds — optimize performance',
    taskType: 'PERF_OPTIMIZATION',
    status: 'success',
    createdAt: '2026-04-17T14:00:00Z',
    updatedAt: '2026-04-17T15:15:00Z',
    generatedPrompts: [
      {
        id: 'p005-1',
        sessionLabel: 'Session 1 — Diagnose (no changes yet)',
        content: `Context: Dashboard first load 3-4s. Goal: diagnose before touching any code.

Steps:
1. Chrome DevTools → Network → disable cache → hard reload → screenshot waterfall
2. Identify: largest requests by size, sequential fetches that could be parallel, blocking scripts
3. Performance tab → record 5s → find long tasks (>50ms, shown in red)
4. Run: npx vite-bundle-visualizer → screenshot bundle breakdown
5. Write a list of top 3 bottlenecks with sizes and timings

Constraints:
- Do NOT change any code in this session — diagnose only
- Capture before screenshots for comparison after optimizations

Verification:
- You have a written list of ≥ 3 bottlenecks with measurements
- You can explain what the critical path request chain is`,
      },
      {
        id: 'p005-2',
        sessionLabel: 'Session 2 — Optimize',
        content: `Context: Bottlenecks identified in Session 1. Now implementing fixes.

Steps:
1. Read the bottleneck list from Session 1
2. If large bundle: add React.lazy() + Suspense for heavy routes/components
3. If sequential API calls: switch to Promise.all() or batch endpoint
4. If no cache headers: add Cache-Control to static assets in vite.config.ts
5. If large images: add loading="lazy" and explicit width/height attributes
6. Re-run Lighthouse → record After metrics

Constraints:
- One fix per commit with before/after measurements in commit message
- Do NOT optimize prematurely — only address the measured bottlenecks

Verification:
- First load ≤ 1.5s on throttled 4G (Chrome DevTools throttling)
- LCP improves in Lighthouse vs baseline
- Bundle size reduced (compare visualizer screenshots)`,
      },
    ],
    generatedFiles: [],
    generatedPlan: [
      { session: 1, title: 'Diagnose', description: 'Network waterfall, bundle analysis, long task identification — no code changes', estimatedTime: '20 min' },
      { session: 2, title: 'Optimize', description: 'Address measured bottlenecks: lazy loading, parallel fetches, cache headers', estimatedTime: '45 min' },
    ],
    generatedChecklist: [
      'Before screenshot: Network waterfall showing baseline timing',
      'Before screenshot: Bundle visualizer showing chunk sizes',
      'After: First load ≤ 1.5s on throttled 4G',
      'After: LCP improved vs baseline in Lighthouse',
      'After: Bundle visualizer shows reduced chunk sizes',
    ],
  },
  {
    id: 'task-006',
    input: 'Write technical documentation for the notification system',
    taskType: 'DOC_OR_SPEC',
    status: 'success',
    createdAt: '2026-04-16T11:00:00Z',
    updatedAt: '2026-04-16T11:45:00Z',
    generatedPrompts: [
      {
        id: 'p006-1',
        sessionLabel: 'Write Notification System Docs',
        content: `Context: Writing technical documentation for the notification system. Audience: engineers new to the project.

Steps:
1. Read all notification files: grep -r "notification" src/ --include="*.ts" -l
2. Identify: notification types, delivery channels, trigger events, retry logic
3. Write docs/notifications.md with sections:
   - Overview (purpose, 2 paragraphs, < 200 words)
   - Notification Types (table: type | trigger | channel | retry policy)
   - Quickstart (minimal code example to send a notification)
   - Configuration (env vars, provider setup)
   - Error Handling & Retries
   - Troubleshooting (top 3 failure modes + fixes)
4. Add JSDoc to the main notify() function if missing

Constraints:
- Audience: engineers new to the project, not end users
- Every code example in the doc must compile without errors
- Keep overview ≤ 200 words

Verification:
- New engineer can understand the system in < 5 min (get someone to read-test)
- All code examples compile
- All notification types and channels documented`,
      },
    ],
    generatedFiles: [],
    generatedPlan: [
      { session: 1, title: 'Write Docs', description: 'Audience-tuned technical documentation with examples and troubleshooting', estimatedTime: '20 min' },
    ],
    generatedChecklist: [
      'All notification types documented with code examples',
      'Code examples compile without errors',
      'Troubleshooting covers top 3 failure modes',
      'New engineer read-tested — understood in < 10 min',
    ],
  },
];
