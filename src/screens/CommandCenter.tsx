import { useState, useRef, useEffect } from 'react';
import { Send, FolderOpen, Zap, ChevronDown, ChevronUp, CheckSquare, FileText, List } from 'lucide-react';
import { TaskTypePill } from '../components/TaskTypePill';
import { CopyButton } from '../components/CopyButton';
import { colors, fonts, radius, space, transitions } from '../lib/designSystem';
import type { Task, OutputTab, ProjectMode, ScannedContext } from '../types';

/* ─── Shared Output Panel ─── */
interface OutputPanelProps {
  task: Task;
  defaultTab?: OutputTab;
}

function OutputPanel({ task, defaultTab = 'prompts' }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<OutputTab>(defaultTab);

  const TABS: { id: OutputTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'prompts',   label: 'Prompts',   icon: <Zap size={13} />,        count: task.generatedPrompts.length },
    { id: 'files',     label: 'Files',     icon: <FileText size={13} />,   count: task.generatedFiles.length },
    { id: 'plan',      label: 'Plan',      icon: <List size={13} />,       count: task.generatedPlan.length },
    { id: 'checklist', label: 'Checklist', icon: <CheckSquare size={13} />,count: task.generatedChecklist.length },
  ];

  return (
    <div
      style={{
        background: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.xl,
        overflow: 'hidden',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.border}`,
          background: colors.bgMuted,
          padding: `0 ${space.xs}`,
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: space.sm,
              padding: `11px ${space.md}`,
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${colors.blue}` : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.id ? colors.fg : colors.fgMuted,
              fontSize: '12px',
              fontFamily: fonts.sans,
              fontWeight: activeTab === tab.id ? 500 : 400,
              cursor: 'pointer',
              transition: `color ${transitions.fast}`,
              marginBottom: '-1px',
            }}
            onMouseEnter={e => {
              if (activeTab !== tab.id) (e.currentTarget as HTMLButtonElement).style.color = colors.fgHover;
            }}
            onMouseLeave={e => {
              if (activeTab !== tab.id) (e.currentTarget as HTMLButtonElement).style.color = colors.fgMuted;
            }}
          >
            {tab.icon}
            {tab.label}
            <span
              style={{
                padding: '1px 5px',
                borderRadius: radius.sm,
                background: activeTab === tab.id ? colors.blueBg : colors.bgInput,
                color: activeTab === tab.id ? colors.blueLight : colors.fgDim,
                fontSize: '10px',
                fontFamily: fonts.mono,
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, padding: space.lg, overflowY: 'auto' }}>
        {activeTab === 'prompts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: space.lg }}>
            {task.generatedPrompts.map((prompt) => (
              <div
                key={prompt.id}
                style={{
                  background: colors.bgMuted,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.lg,
                  overflow: 'hidden',
                }}
              >
                {/* Prompt header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: '1px solid #1c1c22',
                    background: '#0f0f12',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: '"JetBrains Mono", monospace',
                      color: '#3b82f6',
                      fontWeight: 500,
                    }}
                  >
                    {prompt.sessionLabel}
                  </span>
                  <CopyButton text={prompt.content} />
                </div>
                {/* Prompt body */}
                <pre
                  style={{
                    margin: 0,
                    padding: '14px',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '12px',
                    lineHeight: '1.7',
                    color: '#d4d4d8',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowX: 'auto',
                  }}
                >
                  {prompt.content}
                </pre>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'files' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {task.generatedFiles.length === 0 ? (
              <EmptyTabState message="No supporting files generated for this task type." />
            ) : (
              task.generatedFiles.map(file => (
                <div
                  key={file.id}
                  style={{
                    background: '#0a0a0d',
                    border: '1px solid #1c1c22',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderBottom: '1px solid #1c1c22',
                      background: '#0f0f12',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', color: '#22c55e', fontWeight: 500 }}>
                      📄 {file.filename}
                    </span>
                    <CopyButton text={file.content} />
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '14px',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '12px',
                      lineHeight: '1.7',
                      color: '#d4d4d8',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {file.content}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'plan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {task.generatedPlan.map(step => (
              <div
                key={step.session}
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '14px',
                  background: '#0a0a0d',
                  border: '1px solid #1c1c22',
                  borderRadius: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#1e3a5f',
                    border: '1px solid #3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '11px',
                    fontFamily: '"JetBrains Mono", monospace',
                    color: '#93c5fd',
                    fontWeight: 600,
                  }}
                >
                  {step.session}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#fafafa', fontWeight: 500, marginBottom: '3px' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#71717a', lineHeight: '1.5' }}>
                    {step.description}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: '"JetBrains Mono", monospace',
                    color: '#52525b',
                    background: '#18181b',
                    border: '1px solid #1c1c22',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {step.estimatedTime}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'checklist' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#71717a', fontFamily: '"JetBrains Mono", monospace' }}>
              Run these checks after Claude Code finishes each session:
            </p>
            {task.generatedChecklist.map((item, i) => (
              <ChecklistItem key={i} text={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <div
      onClick={() => setChecked(c => !c)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '10px 12px',
        background: checked ? '#0d1f0d' : '#0a0a0d',
        border: `1px solid ${checked ? '#14532d' : '#1c1c22'}`,
        borderRadius: '7px',
        cursor: 'pointer',
        transition: 'all 0.12s',
      }}
    >
      <div
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '4px',
          border: `1.5px solid ${checked ? '#22c55e' : '#3c3c48'}`,
          background: checked ? '#22c55e' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '1px',
          transition: 'all 0.12s',
        }}
      >
        {checked && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span
        style={{
          fontSize: '12px',
          color: checked ? '#52525b' : '#d4d4d8',
          fontFamily: '"JetBrains Mono", monospace',
          lineHeight: '1.5',
          textDecoration: checked ? 'line-through' : 'none',
          transition: 'color 0.12s',
        }}
      >
        {text}
      </span>
    </div>
  );
}

function EmptyTabState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '32px',
        textAlign: 'center',
        color: '#52525b',
        fontSize: '13px',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      {message}
    </div>
  );
}

/* ─── Loading Skeleton ─── */
function GeneratingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px 0' }}>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            height: i === 1 ? '100px' : i === 2 ? '60px' : '40px',
            background: 'linear-gradient(90deg, #0f0f12 25%, #16161a 50%, #0f0f12 75%)',
            backgroundSize: '200% 100%',
            borderRadius: '8px',
            animation: 'shimmer 1.4s infinite',
          }}
        />
      ))}
      <style>{`@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`}</style>
    </div>
  );
}

/* ─── CLI Error States ─── */
function CliNotInstalledBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        background: '#4a2c2c',
        border: '1px solid #8b4444',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#fca5a5', marginBottom: '6px' }}>
          Claude Code CLI not found
        </div>
        <div style={{ fontSize: '12px', color: '#d4d4d8', lineHeight: '1.5', marginBottom: '8px' }}>
          Install the CLI to generate real prompts:{' '}
          <code style={{ background: '#2a1a1a', padding: '2px 6px', borderRadius: '4px' }}>
            npm install -g @anthropic-ai/claude-code
          </code>
        </div>
        <a
          href="https://claude.ai/code"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '12px',
            color: '#93c5fd',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Learn more →
        </a>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#a1a1aa',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '0 8px',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

function GenerationErrorBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        background: '#4a2c2c',
        border: '1px solid #8b4444',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#fca5a5', marginBottom: '4px' }}>
          Generation failed
        </div>
        <div style={{ fontSize: '12px', color: '#d4d4d8' }}>
          An error occurred while generating the task. Please try again.
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#a1a1aa',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '0 8px',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

/* ─── Project Context Card ─── */
interface ProjectContextCardProps {
  scannedContext: ScannedContext | null;
  isScanning: boolean;
  scanError: string | null;
  projectPath: string;
  onRescan: () => void;
}

function ProjectContextCard({ scannedContext, isScanning, scanError, projectPath, onRescan }: ProjectContextCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Scanning state
  if (isScanning) {
    return (
      <div
        style={{
          background: '#0a0a0d',
          border: '1px solid #1c1c22',
          borderRadius: '8px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            border: '1.5px solid #52525b',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: '12px', color: '#a1a1aa', fontFamily: '"JetBrains Mono", monospace' }}>
          Scanning {projectPath}…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (scanError) {
    return (
      <div
        style={{
          background: '#4a2c2c',
          border: '1px solid #8b4444',
          borderRadius: '8px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#fca5a5', marginBottom: '4px' }}>
            Scan failed
          </div>
          <div style={{ fontSize: '11px', color: '#d4d4d8', fontFamily: '"JetBrains Mono", monospace' }}>
            {scanError}
          </div>
        </div>
        <button
          onClick={onRescan}
          style={{
            padding: '4px 10px',
            background: 'transparent',
            border: '1px solid #8b4444',
            borderRadius: '4px',
            color: '#fca5a5',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // No scanned context
  if (!scannedContext) {
    return (
      <div
        style={{
          background: '#0a0a0d',
          border: '1px solid #1c1c22',
          borderRadius: '8px',
          padding: '12px 14px',
          color: '#71717a',
          fontSize: '12px',
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        Select a folder to scan for project context
      </div>
    );
  }

  // No companion files warning
  if (!scannedContext.hasCompanionFiles) {
    return (
      <div
        style={{
          background: '#5f3e0a',
          border: '1px solid #b8860b',
          borderRadius: '8px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#fcd34d', marginBottom: '4px' }}>
            No SPEC.md or CLAUDE.md found
          </div>
          <div style={{ fontSize: '11px', color: '#d4d4d8' }}>
            Output will be generic. Add SPEC.md or CLAUDE.md to provide project context.
          </div>
        </div>
      </div>
    );
  }

  // Full context card
  return (
    <div
      style={{
        background: '#0a0a0d',
        border: '1px solid #1c1c22',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setExpanded(x => !x)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#d4d4d8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', color: '#71717a' }}>Project Context</span>
          <span style={{ fontSize: '10px', fontFamily: '"JetBrains Mono", monospace', color: '#3b82f6', background: '#1e3a5f', padding: '1px 6px', borderRadius: '4px' }}>
            DETECTED
          </span>
          {scannedContext.techStack.map(tech => <Badge key={tech} label={tech} />)}
        </div>
        {expanded ? <ChevronUp size={13} color="#71717a" /> : <ChevronDown size={13} color="#71717a" />}
      </button>
      {expanded && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid #1c1c22' }}>
          <div style={{ paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <ContextRow label="Path" value={scannedContext.projectPath} />
            {scannedContext.techStack.length > 0 && (
              <ContextRow label="Stack" value={scannedContext.techStack.join(', ')} />
            )}
            {scannedContext.keyFiles.map(file => (
              <ContextRow
                key={file.filename}
                label={file.filename}
                value={file.found ? (file.excerpt ? `✓ ${file.excerpt}` : '✓ Found') : '—'}
              />
            ))}
            {scannedContext.rules.length > 0 && (
              <ContextRow
                label="Rules"
                value={`${scannedContext.rules.length} rules detected`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: '10px',
        fontFamily: '"JetBrains Mono", monospace',
        color: '#71717a',
        background: '#18181b',
        border: '1px solid #1c1c22',
        padding: '1px 6px',
        borderRadius: '4px',
      }}
    >
      {label}
    </span>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '10px', fontSize: '11px', fontFamily: '"JetBrains Mono", monospace' }}>
      <span style={{ color: '#52525b', minWidth: '80px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#a1a1aa' }}>{value}</span>
    </div>
  );
}

/* ─── Hardcoded fake output data ─── */

interface FakeStep {
  text: string;
  command?: string;
}

interface FakeSection {
  type: 'context' | 'steps' | 'constraints' | 'verification';
  text?: string;
  items?: FakeStep[];
}

interface FakePrompt {
  id: string;
  sessionLabel: string;
  fullText: string;
  sections: FakeSection[];
}

const FAKE_PROMPTS: FakePrompt[] = [
  {
    id: 'fp-1',
    sessionLabel: 'Session 1 — Scaffold & Storage',
    fullText: `Context: Building a local CLI expense tracker. Node.js + TypeScript + SQLite for local storage.

Steps:
1. Initialize project: mkdir expense-tracker && cd expense-tracker && npm init -y
2. Install runtime deps: npm install better-sqlite3 commander chalk date-fns
3. Install dev deps: npm install -D typescript @types/node @types/better-sqlite3 ts-node
4. Create src/db.ts — SQLite setup with expenses table (id, amount, category, note, date)
5. Create src/cli.ts — Commander.js entry point with --version flag

Constraints:
- TypeScript strict mode, no \`any\`
- Data stored in ~/.expense-tracker/data.db — never in the project dir
- No network requests — fully offline

Verification:
- npx ts-node src/cli.ts --version
- npx ts-node src/cli.ts add 12.50 food "Lunch"
- npx tsc --noEmit`,
    sections: [
      {
        type: 'context',
        text: 'Building a local CLI expense tracker. Node.js + TypeScript + SQLite for local storage. No network, no cloud, no paid APIs.',
      },
      {
        type: 'steps',
        items: [
          { text: 'Initialize project', command: 'mkdir expense-tracker && cd expense-tracker && npm init -y' },
          { text: 'Install runtime dependencies', command: 'npm install better-sqlite3 commander chalk date-fns' },
          { text: 'Install dev dependencies', command: 'npm install -D typescript @types/node @types/better-sqlite3 ts-node' },
          { text: 'Create src/db.ts — SQLite setup with expenses table: id, amount, category, note, date' },
          { text: 'Create src/cli.ts — Commander.js entry point with --version flag' },
        ],
      },
      {
        type: 'constraints',
        items: [
          { text: 'TypeScript strict mode, no `any`' },
          { text: 'Data stored in ~/.expense-tracker/data.db — never in the project dir' },
          { text: 'No network requests — fully offline' },
        ],
      },
      {
        type: 'verification',
        items: [
          { text: 'CLI is wired up', command: 'npx ts-node src/cli.ts --version' },
          { text: 'Test add command', command: 'npx ts-node src/cli.ts add 12.50 food "Lunch"' },
          { text: 'Zero type errors', command: 'npx tsc --noEmit' },
        ],
      },
    ],
  },
  {
    id: 'fp-2',
    sessionLabel: 'Session 2 — Core Commands',
    fullText: `Context: Scaffold and DB from Session 1 working. Adding add, list, summary, delete commands.

Steps:
1. Read src/db.ts and src/cli.ts — understand existing structure before changing anything
2. Add \`add <amount> <category> [note]\` — validates amount > 0, inserts row, prints ID
3. Add \`list [--month YYYY-MM]\` — queries DB, renders chalk table, defaults to current month
4. Add \`summary [--month YYYY-MM]\` — GROUP BY category, show per-category totals
5. Add \`delete <id>\` — y/n confirmation before deleting

Constraints:
- Validate amount is a positive number — exit code 1 with clear message if not
- Default --month to current month using date-fns format
- Diagnose before mutate — read existing code before adding each command

Verification:
- npx ts-node src/cli.ts add 45.00 transport "Uber"
- npx ts-node src/cli.ts list --month 2026-04
- npx ts-node src/cli.ts summary`,
    sections: [
      {
        type: 'context',
        text: 'Scaffold and DB from Session 1 are working. Now adding the core add, list, summary, and delete commands with validation.',
      },
      {
        type: 'steps',
        items: [
          { text: 'Read src/db.ts and src/cli.ts — understand existing structure before touching anything' },
          { text: 'Add `add <amount> <category> [note]` — validate amount > 0, insert row, print ID' },
          { text: 'Add `list [--month YYYY-MM]` — query DB, render chalk table, default to current month' },
          { text: 'Add `summary [--month YYYY-MM]` — GROUP BY category, show totals per category' },
          { text: 'Add `delete <id>` — prompt y/n confirmation before deleting' },
        ],
      },
      {
        type: 'constraints',
        items: [
          { text: 'amount must be a positive number — exit 1 with helpful message if not' },
          { text: 'Default --month to current month (use date-fns to format)' },
          { text: 'Diagnose before mutate — read all existing code before adding each command' },
        ],
      },
      {
        type: 'verification',
        items: [
          { text: 'Add an expense', command: 'npx ts-node src/cli.ts add 45.00 transport "Uber"' },
          { text: 'List this month', command: 'npx ts-node src/cli.ts list --month 2026-04' },
          { text: 'Show category summary', command: 'npx ts-node src/cli.ts summary' },
        ],
      },
    ],
  },
  {
    id: 'fp-3',
    sessionLabel: 'Session 3 — CSV Export & Categories',
    fullText: `Context: add/list/summary working. Adding CSV export and category management.

Steps:
1. Read src/cli.ts — understand current command layout
2. Add \`export [--month YYYY-MM] [--output path]\` — query → format CSV → write file
3. Default output path: ~/expense-export-YYYY-MM.csv
4. Add \`categories list\` and \`categories add <name>\` subcommands
5. Test the export end-to-end

Constraints:
- CSV header row must be: id,date,amount,category,note
- Never overwrite existing file without --force flag
- Categories in a separate table, referenced by name

Verification:
- npx ts-node src/cli.ts export --month 2026-04 --output ./test.csv
- cat ./test.csv
- npx ts-node src/cli.ts categories list`,
    sections: [
      {
        type: 'context',
        text: 'Core add/list/summary commands work. Adding CSV export and category management subcommands.',
      },
      {
        type: 'steps',
        items: [
          { text: 'Read src/cli.ts — understand current command layout before adding' },
          { text: 'Add `export [--month] [--output]` — query → format CSV → write file' },
          { text: 'Default output path: ~/expense-export-YYYY-MM.csv' },
          { text: 'Add `categories list` and `categories add <name>` subcommands' },
          { text: 'Test export end-to-end', command: 'npx ts-node src/cli.ts export --month 2026-04 --output ./april.csv' },
        ],
      },
      {
        type: 'constraints',
        items: [
          { text: 'CSV header row: id,date,amount,category,note' },
          { text: 'Never overwrite existing file without --force flag' },
          { text: 'Categories live in a separate table, referenced by name' },
        ],
      },
      {
        type: 'verification',
        items: [
          { text: 'Export to file', command: 'npx ts-node src/cli.ts export --month 2026-04 --output ./test.csv' },
          { text: 'Inspect header row', command: 'cat ./test.csv' },
          { text: 'List categories', command: 'npx ts-node src/cli.ts categories list' },
        ],
      },
    ],
  },
];

const FAKE_FILES = [
  {
    filename: 'SPEC.md',
    content: `# Expense Tracker CLI — SPEC

## Purpose
A fully local, offline CLI tool for tracking personal expenses with categories,
monthly summaries, and CSV export. No cloud, no accounts, no paid APIs.

## Tech Stack
- Node.js 20 + TypeScript 5 (strict)
- Commander.js   — CLI argument parsing
- better-sqlite3 — local SQLite (~/.expense-tracker/data.db)
- chalk          — terminal output formatting
- date-fns       — date parsing and formatting

## Commands
\`\`\`
add <amount> <category> [note]           Add an expense
list [--month YYYY-MM]                   List expenses, newest first
summary [--month YYYY-MM]                Category totals for the month
export [--month YYYY-MM] [--output path] Export to CSV
categories list                          Show all categories
categories add <name>                    Add a category
delete <id>                              Delete an expense (with confirmation)
\`\`\`

## Data Location
~/.expense-tracker/data.db  (auto-created on first run)
Never written to the project directory.

## Build Order
1. Scaffold + DB setup + add command
2. list, summary, delete commands
3. CSV export + category management
4. Budget alerts + recurring entries`,
  },
  {
    filename: 'CLAUDE.md',
    content: `# CLAUDE.md — Expense Tracker Rules

Read SPEC.md before any task.

## Rules
- TypeScript strict mode — no \`any\`
- Diagnose before mutate — read existing code first
- One command per session
- Data goes to ~/.expense-tracker/ only — never the project dir
- No network requests, no paid APIs

## Code Structure
\`\`\`
src/
  cli.ts     — Commander.js program + command definitions
  db.ts      — SQLite setup, schema, query helpers
  format.ts  — chalk-based table and summary renderers
  export.ts  — CSV generation logic
\`\`\`

## Input Validation
- amount: positive finite number — exit 1 with message if not
- category: must exist in categories table
- date: defaults to today, accepts YYYY-MM-DD

## Error Handling
- Invalid input → specific error + exit code 1
- Missing DB → auto-create schema on first run
- File conflict → require --force to overwrite`,
  },
];

const FAKE_PLAN = [
  { session: 1, title: 'Scaffold & Storage',         description: 'Project init, SQLite schema, Commander.js entry point', estimatedTime: '30 min' },
  { session: 2, title: 'Core Commands',              description: 'add, list, summary, delete with input validation',       estimatedTime: '40 min' },
  { session: 3, title: 'CSV Export & Categories',    description: 'export command, category subcommands, --force flag',     estimatedTime: '30 min' },
  { session: 4, title: 'Budget Alerts',              description: 'Per-category monthly budgets and threshold warnings',    estimatedTime: '25 min' },
];

const FAKE_CHECKLIST = [
  'npx ts-node src/cli.ts --version → prints version without error',
  'npx ts-node src/cli.ts add 12.50 food "Lunch" → row inserted, ID printed',
  'npx ts-node src/cli.ts list --month 2026-04 → table renders with correct data',
  'npx ts-node src/cli.ts summary → category totals sum to total spend',
  'npx ts-node src/cli.ts export --output ./test.csv → file created',
  'cat ./test.csv → first line is: id,date,amount,category,note',
  'npx tsc --noEmit → zero TypeScript errors',
];

/* ─── Tab content components ─── */

function CommandLine({ command }: { command: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        background: '#0a0a0d',
        border: '1px solid #1c1c22',
        borderRadius: '6px',
        padding: '7px 10px',
        marginTop: '4px',
      }}
    >
      <code
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '11px',
          color: '#86efac',
          wordBreak: 'break-all',
          flex: 1,
        }}
      >
        $ {command}
      </code>
      <CopyButton text={command} />
    </div>
  );
}

function SectionLabel({ type }: { type: FakeSection['type'] }) {
  const COLOR: Record<FakeSection['type'], string> = {
    context:      '#71717a',
    steps:        '#3b82f6',
    constraints:  '#f59e0b',
    verification: '#22c55e',
  };
  return (
    <div
      style={{
        fontSize: '10px',
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: COLOR[type],
        marginBottom: '8px',
      }}
    >
      {type}
    </div>
  );
}

function PromptsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {FAKE_PROMPTS.map(prompt => (
        <div
          key={prompt.id}
          style={{ background: '#0a0a0d', border: '1px solid #1c1c22', borderRadius: '8px', overflow: 'hidden' }}
        >
          {/* Session header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '1px solid #1c1c22',
              background: '#0f0f12',
            }}
          >
            <span style={{ fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', color: '#3b82f6', fontWeight: 600 }}>
              {prompt.sessionLabel}
            </span>
            <CopyButton text={prompt.fullText} />
          </div>

          {/* Sections */}
          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {prompt.sections.map((section, si) => (
              <div key={si}>
                <SectionLabel type={section.type} />

                {section.type === 'context' && (
                  <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa', fontFamily: '"JetBrains Mono", monospace', lineHeight: '1.6' }}>
                    {section.text}
                  </p>
                )}

                {section.type !== 'context' &&
                  section.items?.map((item, ii) => (
                    <div key={ii} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#52525b', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', flexShrink: 0, minWidth: '18px', paddingTop: '1px' }}>
                          {section.type === 'steps' ? `${ii + 1}.` : '—'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#a1a1aa', fontFamily: '"JetBrains Mono", monospace', lineHeight: '1.6' }}>
                          {item.text}
                        </span>
                      </div>
                      {item.command && <div style={{ marginLeft: '26px' }}><CommandLine command={item.command} /></div>}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FilesTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {FAKE_FILES.map(file => (
        <div
          key={file.filename}
          style={{ background: '#0a0a0d', border: '1px solid #1c1c22', borderRadius: '8px', overflow: 'hidden' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '1px solid #1c1c22',
              background: '#0f0f12',
            }}
          >
            <span style={{ fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', color: '#22c55e', fontWeight: 600 }}>
              📄 {file.filename}
            </span>
            <CopyButton text={file.content} />
          </div>
          <pre
            style={{
              margin: 0,
              padding: '14px',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '11px',
              lineHeight: '1.7',
              color: '#d4d4d8',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '380px',
              overflowY: 'auto',
            }}
          >
            {file.content}
          </pre>
        </div>
      ))}
    </div>
  );
}

function PlanTab() {
  const totalMins = FAKE_PLAN.reduce((sum, s) => sum + parseInt(s.estimatedTime), 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {FAKE_PLAN.map((step, i) => (
        <div key={step.session} style={{ position: 'relative', display: 'flex', gap: '14px', alignItems: 'flex-start', paddingBottom: '8px' }}>
          {/* Connector line */}
          {i < FAKE_PLAN.length - 1 && (
            <div style={{ position: 'absolute', left: '13px', top: '30px', width: '1px', bottom: '0', background: '#1c1c22' }} />
          )}
          {/* Circle */}
          <div
            style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: '#1e3a5f', border: '1px solid #3b82f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: '11px', fontFamily: '"JetBrains Mono", monospace',
              color: '#93c5fd', fontWeight: 700, zIndex: 1,
            }}
          >
            {step.session}
          </div>
          {/* Card */}
          <div
            style={{
              flex: 1, background: '#0a0a0d', border: '1px solid #1c1c22',
              borderRadius: '8px', padding: '10px 14px',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', color: '#fafafa', fontWeight: 500, marginBottom: '3px' }}>{step.title}</div>
              <div style={{ fontSize: '11px', color: '#71717a', fontFamily: '"JetBrains Mono", monospace', lineHeight: '1.5' }}>{step.description}</div>
            </div>
            <span
              style={{
                fontSize: '10px', fontFamily: '"JetBrains Mono", monospace',
                color: '#52525b', background: '#18181b', border: '1px solid #1c1c22',
                padding: '3px 8px', borderRadius: '5px', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {step.estimatedTime}
            </span>
          </div>
        </div>
      ))}
      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', paddingTop: '10px', borderTop: '1px solid #1c1c22', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>Total estimated:</span>
        <span style={{ fontSize: '12px', color: '#fafafa', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>~{totalMins} min</span>
      </div>
    </div>
  );
}

function ChecklistTab() {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const allText = FAKE_CHECKLIST.join('\n');
  const uncheckedText = FAKE_CHECKLIST.filter((_, i) => !checked.has(i)).join('\n');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>
          Run these after Claude Code finishes each session
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: '"JetBrains Mono", monospace',
              color: checked.size === FAKE_CHECKLIST.length ? '#22c55e' : '#71717a',
            }}
          >
            {checked.size}/{FAKE_CHECKLIST.length} done
          </span>
          <CopyButton text={checked.size > 0 ? uncheckedText : allText} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {FAKE_CHECKLIST.map((item, i) => (
          <div
            key={i}
            onClick={() => toggle(i)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '10px 12px',
              background: checked.has(i) ? '#0d1f0d' : '#0a0a0d',
              border: `1px solid ${checked.has(i) ? '#14532d' : '#1c1c22'}`,
              borderRadius: '7px', cursor: 'pointer', transition: 'all 0.12s',
            }}
          >
            {/* Checkbox */}
            <div
              style={{
                width: '16px', height: '16px', borderRadius: '4px',
                border: `1.5px solid ${checked.has(i) ? '#22c55e' : '#3c3c48'}`,
                background: checked.has(i) ? '#22c55e' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '1px', transition: 'all 0.12s',
              }}
            >
              {checked.has(i) && (
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            {/* Text */}
            <span
              style={{
                flex: 1, fontSize: '12px', fontFamily: '"JetBrains Mono", monospace',
                lineHeight: '1.5',
                color: checked.has(i) ? '#52525b' : '#d4d4d8',
                textDecoration: checked.has(i) ? 'line-through' : 'none',
                transition: 'color 0.12s',
              }}
            >
              {item}
            </span>
            {/* Per-item copy — stop propagation so it doesn't toggle */}
            <div onClick={e => e.stopPropagation()}>
              <CopyButton text={item} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Command Center ─── */
interface Props {
  onGenerate: (input: string, projectPath?: string) => Promise<void>;
  currentTask: Task | null;
  isGenerating: boolean;
  selectedTask: Task | null;
  onClearSelection: () => void;
  onCancel?: () => void;
  cliError?: 'not_installed' | 'generation_failed' | null;
  onClearError?: () => void;
  scannedContext?: ScannedContext | null;
  isScanning?: boolean;
  scanError?: string | null;
  onScanProject?: (path: string) => Promise<void>;
  knownIssuesCount?: number;
}

export function CommandCenter({
  onGenerate,
  currentTask,
  isGenerating,
  selectedTask,
  onClearSelection,
  onCancel,
  cliError,
  onClearError,
  scannedContext,
  isScanning,
  scanError,
  onScanProject,
  knownIssuesCount = 0,
}: Props) {
  const [input, setInput] = useState('');
  const [projectMode, setProjectMode] = useState<ProjectMode>('new');
  const [projectPath, setProjectPath] = useState('/Users/you/my-project');
  const [activeTab, setActiveTab] = useState<OutputTab>('prompts');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 240) + 'px';
  }, [input]);

  // Auto-focus textarea and clear input after generation
  useEffect(() => {
    if (!isGenerating && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isGenerating]);

  function handleSubmit() {
    console.log('handleSubmit called', { input: input.trim(), isGenerating });
    if (!input.trim() || isGenerating) {
      console.log('Skipping: no input or already generating');
      return;
    }
    console.log('Calling onGenerate with:', { input: input.trim(), projectPath: projectMode === 'existing' ? projectPath : undefined });
    onGenerate(input.trim(), projectMode === 'existing' ? projectPath : undefined);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit();
  }

  function handleSelectFolder() {
    folderInputRef.current?.click();
  }

  function handleFolderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const firstFilePath = files[0].webkitRelativePath || files[0].name;
      const folderPath = firstFilePath.split('/')[0];
      setProjectPath(folderPath);
      if (onScanProject) {
        onScanProject(folderPath);
      }
    }
  }

  const TABS: { id: OutputTab; label: string; icon: React.ReactNode }[] = [
    { id: 'prompts',   label: 'Prompts',   icon: <Zap size={13} /> },
    { id: 'files',     label: 'Files',     icon: <FileText size={13} /> },
    { id: 'plan',      label: 'Plan',      icon: <List size={13} /> },
    { id: 'checklist', label: 'Checklist', icon: <CheckSquare size={13} /> },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          padding: '14px 24px',
          borderBottom: '1px solid #1c1c22',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: '#0a0a0d',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fafafa' }}>Command Center</h1>
          <p style={{ margin: 0, fontSize: '11px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>
            Describe your task → get structured Claude Code prompts
          </p>
        </div>
        {currentTask && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>Detected type:</span>
            <TaskTypePill type={currentTask.taskType} size="md" />
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Input area */}
        <div
          style={{
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.xl,
            overflow: 'hidden',
            transition: `border-color ${transitions.fast}`,
          }}
          onFocusCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = colors.blue}
          onBlurCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = colors.border}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build, fix, review, or improve…"
            rows={4}
            style={{
              width: '100%',
              minHeight: '100px',
              maxHeight: '240px',
              background: 'transparent',
              border: 'none',
              resize: 'none',
              padding: '16px',
              color: '#fafafa',
              fontSize: '14px',
              fontFamily: '"Inter", system-ui, sans-serif',
              lineHeight: '1.6',
              display: 'block',
              verticalAlign: 'top',
            }}
          />
        </div>

        {/* Controls bar — separate from textarea */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 0',
          }}
        >
          {/* Project mode toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
            <div
              style={{
                display: 'flex',
                background: colors.bgInput,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                padding: space.xs,
                gap: space.xs,
              }}
            >
              {(['new', 'existing'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setProjectMode(mode)}
                  style={{
                    padding: `${space.xs} ${space.md}`,
                    borderRadius: radius.sm,
                    border: projectMode === mode ? `1px solid ${colors.blue}` : '1px solid transparent',
                    background: projectMode === mode ? colors.blueBg : colors.bgInput,
                    color: projectMode === mode ? colors.blueLight : colors.fgHover,
                    fontSize: '11px',
                    fontFamily: fonts.sans,
                    fontWeight: projectMode === mode ? 600 : 500,
                    cursor: 'pointer',
                    transition: transitions.fast,
                  }}
                  onMouseEnter={e => {
                    if (projectMode !== mode) {
                      (e.currentTarget as HTMLButtonElement).style.background = colors.borderLight;
                      (e.currentTarget as HTMLButtonElement).style.color = colors.fg;
                    }
                  }}
                  onMouseLeave={e => {
                    if (projectMode !== mode) {
                      (e.currentTarget as HTMLButtonElement).style.background = colors.bgInput;
                      (e.currentTarget as HTMLButtonElement).style.color = colors.fgHover;
                    }
                  }}
                >
                  {mode === 'new' ? 'New Project' : 'Existing Project'}
                </button>
              ))}
            </div>

            {projectMode === 'existing' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#18181b',
                  border: '1px solid #1c1c22',
                  borderRadius: '6px',
                  padding: '4px 10px',
                }}
              >
                <FolderOpen size={12} color="#71717a" />
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: '"JetBrains Mono", monospace',
                    color: '#a1a1aa',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {projectPath}
                </span>
                <button
                  onClick={handleSelectFolder}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                >
                  browse
                </button>
              </div>
            )}
          </div>

          {/* Submit / Cancel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isGenerating && (
              <span style={{ fontSize: '10px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>
                ⌘↵
              </span>
            )}
            {isGenerating && onCancel ? (
              <button
                onClick={onCancel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '7px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  fontFamily: '"Inter", system-ui, sans-serif',
                }}
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isGenerating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '7px',
                  border: 'none',
                  background: !input.trim() || isGenerating ? '#14532d66' : '#22c55e',
                  color: !input.trim() || isGenerating ? '#52525b' : '#000',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: !input.trim() || isGenerating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.12s',
                  fontFamily: '"Inter", system-ui, sans-serif',
                }}
              >
                {isGenerating ? (
                  <>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        border: '1.5px solid #52525b',
                        borderTopColor: '#22c55e',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    Generating…
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    Generate
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Project context (when existing mode) */}
        {projectMode === 'existing' && (
          <ProjectContextCard
            scannedContext={scannedContext}
            isScanning={isScanning}
            scanError={scanError}
            projectPath={projectPath}
            onRescan={() => onScanProject?.(projectPath)}
          />
        )}

        {/* Known Issues Indicator */}
        {knownIssuesCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: '#2d1f4a',
              border: '1px solid #5b3d8a',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: '"JetBrains Mono", monospace',
              color: '#c4b5fd',
            }}
          >
            <span>⟳</span>
            Learning from {knownIssuesCount} past{' '}
            {knownIssuesCount === 1 ? 'issue' : 'issues'}
          </div>
        )}

        {/* CLI Error Banners */}
        {cliError === 'not_installed' && onClearError && (
          <CliNotInstalledBanner onDismiss={onClearError} />
        )}
        {cliError === 'generation_failed' && onClearError && (
          <GenerationErrorBanner onDismiss={onClearError} />
        )}

        {/* Tabbed output panel — always visible */}
        {isGenerating ? (
          <GeneratingState />
        ) : selectedTask ? (
          /* ── Selected task: show real output ── */
          <div>
            {/* Task header strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: '#0a0a0d',
                border: '1px solid #1c1c22',
                borderRadius: '10px 10px 0 0',
                borderBottom: 'none',
              }}
            >
              <TaskTypePill type={selectedTask.taskType} size="md" />
              <span
                style={{
                  flex: 1,
                  fontSize: '12px',
                  color: '#d4d4d8',
                  fontFamily: '"Inter", system-ui, sans-serif',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedTask.title}
              </span>
              <span style={{ fontSize: '10px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace', flexShrink: 0 }}>
                {new Date(selectedTask.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={onClearSelection}
                title="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#52525b',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  lineHeight: 1,
                  fontSize: '14px',
                  flexShrink: 0,
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#fafafa'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#52525b'}
              >
                ×
              </button>
            </div>
            <OutputPanel task={selectedTask} />
          </div>
        ) : (
          /* ── Default demo: hardcoded fake tabs ── */
          <div
            style={{
              background: '#0f0f12',
              border: '1px solid #1c1c22',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            {/* Tab bar */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #1c1c22',
                background: '#0a0a0d',
                padding: '0 4px',
              }}
            >
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '11px 16px',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                    background: 'transparent',
                    color: activeTab === tab.id ? '#fafafa' : '#71717a',
                    fontSize: '12px',
                    fontFamily: '"Inter", system-ui, sans-serif',
                    fontWeight: activeTab === tab.id ? 500 : 400,
                    cursor: 'pointer',
                    transition: 'color 0.12s',
                    marginBottom: '-1px',
                  }}
                  onMouseEnter={e => {
                    if (activeTab !== tab.id)
                      (e.currentTarget as HTMLButtonElement).style.color = '#d4d4d8';
                  }}
                  onMouseLeave={e => {
                    if (activeTab !== tab.id)
                      (e.currentTarget as HTMLButtonElement).style.color = '#71717a';
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: '16px' }}>
              {activeTab === 'prompts'   && <PromptsTab />}
              {activeTab === 'files'     && <FilesTab />}
              {activeTab === 'plan'      && <PlanTab />}
              {activeTab === 'checklist' && <ChecklistTab />}
            </div>
          </div>
        )}
      </div>

      {/* Hidden folder picker */}
      <input
        ref={folderInputRef}
        type="file"
        onChange={handleFolderChange}
        style={{ display: 'none' }}
        {...({ webkitdirectory: 'true' } as any)}
      />
    </div>
  );
}

/* ─── Task Detail View ─── */
interface TaskDetailProps {
  task: Task;
  onUpdateStatus: (taskId: string, status: 'success' | 'error', notes?: string) => void;
  onRetry: (task: Task) => void;
}

export function TaskDetail({ task, onUpdateStatus, onRetry }: TaskDetailProps) {
  const [feedbackMode, setFeedbackMode] = useState<'none' | 'error'>('none');
  const [errorNotes, setErrorNotes] = useState(task.errorNotes ?? '');
  const [savedStatus, setSavedStatus] = useState<'success' | 'error' | null>(
    task.status === 'pending' ? null : task.status
  );

  function handleWorked() {
    setSavedStatus('success');
    onUpdateStatus(task.id, 'success');
    setFeedbackMode('none');
  }

  function handleError() {
    setFeedbackMode('error');
  }

  function handleSaveError() {
    setSavedStatus('error');
    onUpdateStatus(task.id, 'error', errorNotes);
  }

  function handleRetry() {
    onRetry(task);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 24px',
          borderBottom: '1px solid #1c1c22',
          flexShrink: 0,
          background: '#0a0a0d',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <TaskTypePill type={task.taskType} size="md" />
          <span style={{ fontSize: '11px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>
            {new Date(task.createdAt).toLocaleString()}
          </span>
          {savedStatus && (
            <span
              style={{
                fontSize: '10px',
                fontFamily: '"JetBrains Mono", monospace',
                color: savedStatus === 'success' ? '#22c55e' : '#ef4444',
                background: savedStatus === 'success' ? '#14532d' : '#5f1d1d',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              {savedStatus === 'success' ? '✓ WORKED' : '✗ ERROR'}
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: '#d4d4d8', lineHeight: '1.5' }}>
          {task.input}
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <OutputPanel task={task} />

        {/* Feedback section */}
        <div
          style={{
            background: '#0f0f12',
            border: '1px solid #1c1c22',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#71717a', fontFamily: '"JetBrains Mono", monospace' }}>
            Did these prompts work?
          </p>

          {savedStatus === null && feedbackMode === 'none' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleWorked}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '7px', border: '1px solid #14532d',
                  background: '#0d1f0d', color: '#22c55e', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', fontFamily: '"Inter", system-ui, sans-serif',
                }}
              >
                ✓ Worked
              </button>
              <button
                onClick={handleError}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '7px', border: '1px solid #5f1d1d',
                  background: '#200d0d', color: '#ef4444', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', fontFamily: '"Inter", system-ui, sans-serif',
                }}
              >
                ✗ Error
              </button>
            </div>
          )}

          {feedbackMode === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#71717a' }}>What went wrong? (helps improve future prompts)</p>
              <textarea
                value={errorNotes}
                onChange={e => setErrorNotes(e.target.value)}
                placeholder="e.g. The fix mutated state directly instead of using setState…"
                rows={3}
                style={{
                  background: '#18181b', border: '1px solid #1c1c22', borderRadius: '7px',
                  padding: '10px', color: '#fafafa', fontSize: '12px',
                  fontFamily: '"JetBrains Mono", monospace', resize: 'vertical', lineHeight: '1.5',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveError}
                  style={{
                    padding: '7px 14px', borderRadius: '7px', border: '1px solid #5f1d1d',
                    background: '#200d0d', color: '#ef4444', fontSize: '12px', cursor: 'pointer',
                    fontFamily: '"Inter", system-ui, sans-serif',
                  }}
                >
                  Save error notes
                </button>
                <button
                  onClick={handleRetry}
                  style={{
                    padding: '7px 14px', borderRadius: '7px', border: '1px solid #1e3a5f',
                    background: '#0d1828', color: '#3b82f6', fontSize: '12px', cursor: 'pointer',
                    fontFamily: '"Inter", system-ui, sans-serif',
                  }}
                >
                  Retry with notes →
                </button>
                <button
                  onClick={() => setFeedbackMode('none')}
                  style={{
                    padding: '7px 14px', borderRadius: '7px', border: '1px solid #1c1c22',
                    background: 'transparent', color: '#71717a', fontSize: '12px', cursor: 'pointer',
                    fontFamily: '"Inter", system-ui, sans-serif',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {savedStatus === 'success' && (
            <p style={{ margin: 0, color: '#22c55e', fontSize: '13px' }}>
              ✓ Marked as worked — outcome saved for learning.
            </p>
          )}
          {savedStatus === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0, color: '#ef4444', fontSize: '13px' }}>
                ✗ Error noted — future {task.taskType} prompts will avoid this pattern.
              </p>
              <button
                onClick={handleRetry}
                style={{
                  alignSelf: 'flex-start', padding: '7px 14px', borderRadius: '7px',
                  border: '1px solid #1e3a5f', background: '#0d1828', color: '#3b82f6',
                  fontSize: '12px', cursor: 'pointer', fontFamily: '"Inter", system-ui, sans-serif',
                }}
              >
                Retry with error notes →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
