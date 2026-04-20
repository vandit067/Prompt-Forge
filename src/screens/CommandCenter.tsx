import { useState, useRef, useEffect } from 'react';
import { Send, FolderOpen, Zap, ChevronDown, ChevronUp, CheckSquare, FileText, List } from 'lucide-react';
import { TaskTypePill } from '../components/TaskTypePill';
import { CopyButton } from '../components/CopyButton';
import type { Task, OutputTab, ProjectMode } from '../types';

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
              padding: '11px 14px',
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
              if (activeTab !== tab.id) (e.currentTarget as HTMLButtonElement).style.color = '#d4d4d8';
            }}
            onMouseLeave={e => {
              if (activeTab !== tab.id) (e.currentTarget as HTMLButtonElement).style.color = '#71717a';
            }}
          >
            {tab.icon}
            {tab.label}
            <span
              style={{
                padding: '1px 5px',
                borderRadius: '4px',
                background: activeTab === tab.id ? '#1e3a5f' : '#18181b',
                color: activeTab === tab.id ? '#93c5fd' : '#52525b',
                fontSize: '10px',
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '16px' }}>
        {activeTab === 'prompts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {task.generatedPrompts.map((prompt) => (
              <div
                key={prompt.id}
                style={{
                  background: '#0a0a0d',
                  border: '1px solid #1c1c22',
                  borderRadius: '8px',
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

/* ─── Project Context Card ─── */
function ProjectContextCard() {
  const [expanded, setExpanded] = useState(false);
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
          <Badge label="Electron" />
          <Badge label="React" />
          <Badge label="TypeScript" />
        </div>
        {expanded ? <ChevronUp size={13} color="#71717a" /> : <ChevronDown size={13} color="#71717a" />}
      </button>
      {expanded && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid #1c1c22' }}>
          <div style={{ paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <ContextRow label="Path" value="/Users/you/my-project" />
            <ContextRow label="Stack" value="Electron + Vite + React 18 + TypeScript" />
            <ContextRow label="SPEC.md" value="Found — purpose, 5 screens, build order extracted" />
            <ContextRow label="CLAUDE.md" value="Found — 6 workflow rules, 3 cost rules, 2 safety rules" />
            <ContextRow label="package.json" value="Found — 14 dependencies detected" />
          </div>
          <button
            style={{
              marginTop: '10px',
              padding: '4px 10px',
              background: 'transparent',
              border: '1px solid #1c1c22',
              borderRadius: '5px',
              color: '#71717a',
              fontSize: '11px',
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer',
            }}
          >
            Override context
          </button>
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

/* ─── Main Command Center ─── */
interface Props {
  onGenerate: (input: string, projectPath?: string) => Promise<void>;
  currentTask: Task | null;
  isGenerating: boolean;
}

export function CommandCenter({ onGenerate, currentTask, isGenerating }: Props) {
  const [input, setInput] = useState('');
  const [projectMode, setProjectMode] = useState<ProjectMode>('new');
  const [projectPath, setProjectPath] = useState('/Users/you/my-project');
  const [activeTab, setActiveTab] = useState<OutputTab>('prompts');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 240) + 'px';
  }, [input]);

  function handleSubmit() {
    if (!input.trim() || isGenerating) return;
    onGenerate(input.trim(), projectMode === 'existing' ? projectPath : undefined);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit();
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
            background: '#0f0f12',
            border: '1px solid #1c1c22',
            borderRadius: '12px',
            overflow: 'hidden',
            transition: 'border-color 0.15s',
          }}
          onFocusCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6'}
          onBlurCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#1c1c22'}
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
            }}
          />

          {/* Bottom bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderTop: '1px solid #1c1c22',
              background: '#0a0a0d',
            }}
          >
            {/* Project mode toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  background: '#18181b',
                  border: '1px solid #1c1c22',
                  borderRadius: '7px',
                  padding: '2px',
                  gap: '2px',
                }}
              >
                {(['new', 'existing'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setProjectMode(mode)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      background: projectMode === mode ? '#1c1c22' : 'transparent',
                      color: projectMode === mode ? '#fafafa' : '#71717a',
                      fontSize: '11px',
                      fontFamily: '"Inter", system-ui, sans-serif',
                      fontWeight: projectMode === mode ? 500 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.12s',
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
                    onClick={() => {
                      const p = window.prompt('Enter project path:', projectPath);
                      if (p) setProjectPath(p);
                    }}
                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                  >
                    change
                  </button>
                </div>
              )}
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>
                ⌘↵
              </span>
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
            </div>
          </div>
        </div>

        {/* Project context (when existing mode) */}
        {projectMode === 'existing' && <ProjectContextCard />}

        {/* Tabbed output panel — always visible */}
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
          <div
            style={{
              padding: '28px 24px',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '12px',
              color: '#52525b',
              minHeight: '180px',
              display: 'flex',
              alignItems: 'center',
              lineHeight: '1.7',
            }}
          >
            {activeTab === 'prompts'   && 'Prompts will appear here.'}
            {activeTab === 'files'     && 'Generated files (SPEC.md, CLAUDE.md) will appear here.'}
            {activeTab === 'plan'      && 'Session plan will appear here.'}
            {activeTab === 'checklist' && 'Verification checklist will appear here.'}
          </div>
        </div>
      </div>
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
