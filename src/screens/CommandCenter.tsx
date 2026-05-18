import { useState, useRef, useEffect } from 'react';
import { Send, FolderOpen, Zap, ChevronDown, ChevronUp, CheckSquare, FileText, List, Download, RefreshCw, Copy, FileJson, Code, User, Target, AlertCircle, CheckCircle, Lightbulb, X } from 'lucide-react';
import { TaskTypePill } from '../components/TaskTypePill';
import { CopyButton } from '../components/CopyButton';
import { colors, fonts, radius, space, transitions } from '../lib/designSystem';
import { analyzePrompt } from '../lib/promptOptimizer';
import type { Task, OutputTab, ProjectMode, ScannedContext, ActiveBackend } from '../types';
import type { Suggestion, OptimizationResult } from '../lib/promptOptimizer';

/* ─── Prompt Rendering ─── */
interface PromptSection {
  type: 'role' | 'context' | 'goal' | 'divider' | 'section' | 'text';
  title?: string;
  content: string;
  color?: string;
  icon?: React.ReactNode;
}

function parsePromptSections(content: string): PromptSection[] {
  const sections: PromptSection[] = [];
  const lines = content.split('\n');
  let currentSection = '';
  let currentContent: string[] = [];

  const getSectionColor = (type: string) => {
    const map: Record<string, string> = {
      'Role': '#8b5cf6',
      'Context': '#3b82f6',
      'Goal': '#10b981',
      'Steps': '#f59e0b',
      'Key Constraints': '#ef4444',
      'Expected Output': '#06b6d4',
      'Verification': '#22c55e',
    };
    return map[type] || '#6b7280';
  };

  const getSectionIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Role': <User size={14} />,
      'Goal': <Target size={14} />,
      'Key Constraints': <AlertCircle size={14} />,
      'Verification': <CheckCircle size={14} />,
    };
    return iconMap[type] || null;
  };

  for (const line of lines) {
    if (line === '---') {
      if (currentContent.length > 0) {
        sections.push({
          type: 'section',
          title: currentSection,
          content: currentContent.join('\n').trim(),
          color: getSectionColor(currentSection),
          icon: getSectionIcon(currentSection),
        });
        currentContent = [];
      }
      sections.push({ type: 'divider', content: '' });
    } else if (line.match(/^(Role|Context|Goal|Steps|Key Constraints|Expected Output|Verification):/)) {
      if (currentContent.length > 0) {
        sections.push({
          type: 'section',
          title: currentSection,
          content: currentContent.join('\n').trim(),
          color: getSectionColor(currentSection),
          icon: getSectionIcon(currentSection),
        });
      }
      currentSection = line.replace(':', '').trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections.push({
      type: 'section',
      title: currentSection,
      content: currentContent.join('\n').trim(),
      color: getSectionColor(currentSection),
      icon: getSectionIcon(currentSection),
    });
  }

  return sections.filter(s => s.content.trim() !== '');
}

function OptimizationPanel({ result, onClose }: { result: OptimizationResult; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #1c1c22' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#d4d4d8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lightbulb size={14} style={{ color: '#f59e0b' }} />
            Optimization Suggestions
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6b7280' }}>{result.summary}</p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#d4d4d8')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
        >
          <X size={16} />
        </button>
      </div>

      {/* Improvement Score */}
      <div style={{ padding: '12px', background: '#0f0f12', borderRadius: '6px', border: '1px solid #1c1c22' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#d4d4d8' }}>Improvement Potential</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>{result.improvementScore}%</span>
        </div>
        <div style={{ width: '100%', height: '6px', background: '#0a0a0d', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${result.improvementScore}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Suggestions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {result.suggestions.length === 0 ? (
          <div style={{ padding: '16px', background: '#0f2f0a', border: '1px solid #14532d', borderRadius: '6px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#86efac' }}>
              ✨ This prompt is well-structured!
            </p>
          </div>
        ) : (
          result.suggestions.map(suggestion => (
            <div
              key={suggestion.id}
              style={{
                padding: '12px',
                background: '#0f0f12',
                border: `1px solid ${
                  suggestion.severity === 'high'
                    ? '#5f1d1d'
                    : suggestion.severity === 'medium'
                      ? '#5f3e0a'
                      : '#1c3c1a'
                }`,
                borderRadius: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    background:
                      suggestion.severity === 'high'
                        ? '#5f1d1d'
                        : suggestion.severity === 'medium'
                          ? '#5f3e0a'
                          : '#1c3c1a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color:
                        suggestion.severity === 'high'
                          ? '#ef4444'
                          : suggestion.severity === 'medium'
                            ? '#f59e0b'
                            : '#22c55e',
                    }}
                  >
                    {suggestion.severity === 'high' ? '!' : suggestion.severity === 'medium' ? '−' : '•'}
                  </span>
                </span>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#d4d4d8' }}>
                    {suggestion.title}
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6b7280' }}>
                    {suggestion.description}
                  </p>
                </div>
              </div>

              <div style={{ background: '#0a0a0d', borderRadius: '4px', padding: '10px', marginBottom: '8px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 600, color: '#8b5cf6', textTransform: 'uppercase' }}>
                  Recommendation
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: '#d4d4d8', fontFamily: fonts.mono }}>
                  {suggestion.recommendation}
                </p>
              </div>

              {suggestion.example && (
                <div style={{ background: '#0a0a0d', borderRadius: '4px', padding: '10px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 600, color: '#10b981', textTransform: 'uppercase' }}>
                    Example
                  </p>
                  <pre
                    style={{
                      margin: 0,
                      fontSize: '10px',
                      color: '#6b7280',
                      fontFamily: fonts.mono,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {suggestion.example}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PromptViewer({ content }: { content: string }) {
  const sections = parsePromptSections(content);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {sections.map((section, idx) => {
        if (section.type === 'divider') {
          return (
            <div
              key={`divider-${idx}`}
              style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, #1c1c22 50%, transparent)',
                margin: '8px 0',
              }}
            />
          );
        }

        return (
          <div key={`section-${idx}`}>
            {section.title && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ color: section.color }}>
                  {section.icon}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: section.color,
                    fontFamily: '"JetBrains Mono", monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {section.title}
                </span>
              </div>
            )}
            <pre
              style={{
                margin: 0,
                padding: '10px 12px',
                background: '#0f0f12',
                border: `1px solid ${section.color}22`,
                borderRadius: '4px',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '12px',
                lineHeight: '1.5',
                color: '#d4d4d8',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {section.content}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

/* ─── File Utilities ─── */
function getFileTypeIcon(filename: string) {
  if (filename.endsWith('.json')) return <FileJson size={14} />;
  if (filename.endsWith('.md')) return <FileText size={14} />;
  if (filename.endsWith('.ts') || filename.endsWith('.tsx') || filename.endsWith('.js')) return <Code size={14} />;
  return <FileText size={14} />;
}

function getFileTypeColor(filename: string) {
  if (filename.endsWith('.json')) return '#3b82f6'; // blue
  if (filename.endsWith('.md')) return '#f59e0b'; // amber
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return '#8b5cf6'; // purple
  if (filename.endsWith('.js')) return '#fbbf24'; // yellow
  return '#6b7280'; // gray
}

function downloadFile(filename: string, content: string) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/* ─── Prompt Quality Scorer ─── */
interface QualityScore {
  pct: number;
  grade: 'A' | 'B' | 'C' | 'D';
  color: string;
  breakdown: Array<{ label: string; pass: boolean; pts: number; max: number }>;
}

function scorePrompt(content: string, isLast: boolean): QualityScore {
  const checks = [
    { label: 'Context line',     max: 12, pass: /^Context:/m.test(content) },
    { label: 'Scope + ONLY',     max: 10, pass: /^Scope: ONLY/m.test(content) },
    { label: '3+ steps',         max: 15, pass: (content.match(/^\d+\./gm) || []).length >= 3 },
    { label: 'Abort condition',  max: 10, pass: /STOP and report/i.test(content) },
    { label: 'Verification',     max: 10, pass: /^Verification:/m.test(content) },
    { label: 'Runnable command', max:  8, pass: /\b(curl|npm run|npx|pytest|go test|cargo test|mvn)\b/.test(content) },
    { label: 'Constraints ≥2',  max:  8, pass: (content.match(/^- .+/gm) || []).length >= 2 },
    { label: 'File paths',       max: 12, pass: /src\/[\w/.-]+\.(ts|tsx|js|py|go)/.test(content) },
    ...(!isLast ? [{ label: 'Handoff note', max: 15, pass: /HANDOFF NOTE/.test(content) }] : []),
  ];

  const totalMax = checks.reduce((s, c) => s + c.max, 0);
  const earned   = checks.filter(c => c.pass).reduce((s, c) => s + c.max, 0);
  const pct      = Math.round((earned / totalMax) * 100);
  const grade    = (pct >= 90 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : 'D') as QualityScore['grade'];
  const color    = pct >= 90 ? '#22c55e' : pct >= 70 ? '#3b82f6' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const breakdown = checks.map(c => ({ label: c.label, pass: c.pass, pts: c.pass ? c.max : 0, max: c.max }));

  return { pct, grade, color, breakdown };
}

function QualityBadge({ score }: { score: QualityScore }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={`Prompt quality: ${score.pct}% — click to see breakdown`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 7px',
          borderRadius: '5px',
          border: `1px solid ${score.color}33`,
          background: `${score.color}18`,
          color: score.color,
          fontSize: '10px',
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {score.grade}
        <span style={{ fontWeight: 400, opacity: 0.8 }}>{score.pct}%</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '6px',
            background: '#0f0f12',
            border: '1px solid #27272a',
            borderRadius: '8px',
            padding: '10px 12px',
            zIndex: 10,
            minWidth: '200px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: '10px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace', marginBottom: '8px', letterSpacing: '0.06em' }}>
            QUALITY BREAKDOWN
          </div>
          {score.breakdown.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
              <span style={{ color: item.pass ? '#22c55e' : '#52525b', fontSize: '11px', width: '12px', flexShrink: 0 }}>
                {item.pass ? '✓' : '✗'}
              </span>
              <span style={{ flex: 1, fontSize: '11px', color: item.pass ? '#a1a1aa' : '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>
                {item.label}
              </span>
              <span style={{ fontSize: '10px', color: item.pass ? '#3b82f6' : '#3c3c48', fontFamily: '"JetBrains Mono", monospace' }}>
                +{item.pts}/{item.max}
              </span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #1c1c22', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>Total</span>
            <span style={{ fontSize: '11px', color: score.color, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>{score.pct}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Export as Markdown ─── */
function exportTaskMarkdown(task: Task): void {
  const lines: string[] = [`# ${task.title}`, '', `**Type:** ${task.taskType}`, `**Created:** ${new Date(task.createdAt).toLocaleString()}`, ''];

  if (task.generatedPrompts.length > 0) {
    lines.push('## Prompts', '');
    for (const p of task.generatedPrompts) {
      lines.push(`### ${p.sessionLabel}`, '', '```', p.content, '```', '');
    }
  }

  if (task.generatedFiles.length > 0) {
    lines.push('## Supporting Files', '');
    for (const f of task.generatedFiles) {
      lines.push(`### ${f.filename}`, '', '```', f.content, '```', '');
    }
  }

  if (task.generatedPlan.length > 0) {
    lines.push('## Implementation Plan', '');
    for (const s of task.generatedPlan) {
      lines.push(`${s.session}. **${s.title}** (${s.estimatedTime})`, `   ${s.description}`, '');
    }
  }

  if (task.generatedChecklist.length > 0) {
    lines.push('## Verification Checklist', '');
    for (const item of task.generatedChecklist) {
      lines.push(`- [ ] ${item}`);
    }
    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Refinement Panel ─── */
interface RefinementPanelProps {
  task: Task;
  onRefine: (taskId: string, refinement: string) => Promise<void>;
}

function RefinementPanel({ task, onRefine }: RefinementPanelProps) {
  const [text, setText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [done, setDone] = useState(false);

  async function handleRefine() {
    if (!text.trim() || isRefining) return;
    setIsRefining(true);
    setDone(false);
    try {
      await onRefine(task.id, text.trim());
      setText('');
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } finally {
      setIsRefining(false);
    }
  }

  return (
    <div
      style={{
        background: '#0a0f1a',
        border: '1px solid #1e3a5f',
        borderRadius: '10px',
        overflow: 'hidden',
        marginTop: '8px',
      }}
    >
      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid #1e3a5f',
          background: '#060d18',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
        }}
      >
        <RefreshCw size={11} color="#60a5fa" />
        <span style={{ fontSize: '11px', color: '#60a5fa', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
          Refine prompts
        </span>
        <span style={{ fontSize: '10px', color: '#3b4a63', fontFamily: '"JetBrains Mono", monospace' }}>
          — regenerate with additional instructions
        </span>
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleRefine(); }}
          placeholder="e.g. Add error handling for network failures, make steps more granular, or split Session 2 into two sessions"
          rows={2}
          style={{
            flex: 1,
            background: '#0f1623',
            border: '1px solid #1e3a5f',
            borderRadius: '7px',
            padding: '9px 12px',
            color: '#fafafa',
            fontSize: '12px',
            fontFamily: '"Inter", system-ui, sans-serif',
            lineHeight: '1.5',
            resize: 'none',
            outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = '#3b82f6')}
          onBlur={e => (e.target.style.borderColor = '#1e3a5f')}
        />
        <button
          onClick={handleRefine}
          disabled={!text.trim() || isRefining}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '8px 14px',
            borderRadius: '7px',
            border: 'none',
            background: done ? '#14532d' : (!text.trim() || isRefining ? '#1e3a5f55' : '#2563eb'),
            color: done ? '#22c55e' : (!text.trim() || isRefining ? '#3b4a63' : '#fff'),
            fontSize: '12px',
            fontWeight: 600,
            cursor: !text.trim() || isRefining ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: '"Inter", system-ui, sans-serif',
            transition: 'all 0.12s',
            flexShrink: 0,
          }}
        >
          {done ? '✓ Done' : isRefining ? (
            <>
              <div style={{ width: '11px', height: '11px', border: '1.5px solid #3b4a63', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Refining…
            </>
          ) : (
            <>
              <RefreshCw size={11} />
              Refine
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Shared Output Panel ─── */
interface OutputPanelProps {
  task: Task;
  defaultTab?: OutputTab;
}

function OutputPanel({ task, defaultTab = 'prompts' }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<OutputTab>(defaultTab);
  const [copiedAll, setCopiedAll] = useState(false);

  function handleCopyAll() {
    const all = task.generatedPrompts
      .map((p, i) => `${'─'.repeat(60)}\n${p.sessionLabel}\n${'─'.repeat(60)}\n${p.content}`)
      .join('\n\n');
    navigator.clipboard.writeText(all).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  }

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
          alignItems: 'center',
          borderBottom: `1px solid ${colors.border}`,
          background: colors.bgMuted,
          padding: `0 ${space.xs}`,
        }}
      >
        <div style={{ display: 'flex', flex: 1 }}>
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
        {/* Copy all — only shown on prompts tab with multiple sessions */}
        {activeTab === 'prompts' && task.generatedPrompts.length > 1 && (
          <button
            onClick={handleCopyAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              marginRight: '8px',
              borderRadius: '5px',
              border: `1px solid ${copiedAll ? '#14532d' : '#27272a'}`,
              background: copiedAll ? '#0d1f0d' : 'transparent',
              color: copiedAll ? '#22c55e' : '#71717a',
              fontSize: '10px',
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer',
              transition: 'all 0.12s',
              whiteSpace: 'nowrap',
            }}
          >
            {copiedAll ? '✓ Copied' : `Copy all ${task.generatedPrompts.length}`}
          </button>
        )}
      </div>

      {/* Tab content */}
      <div style={{ padding: space.lg }}>
        {activeTab === 'prompts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: space.lg }}>
            {task.generatedPrompts.map((prompt, idx) => {
              const isLast = idx === task.generatedPrompts.length - 1;
              const score = scorePrompt(prompt.content, isLast);
              return (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <QualityBadge score={score} />
                    <button
                      onClick={() => {
                        if (optimizingPromptId === prompt.id) {
                          setOptimizingPromptId(null);
                        } else {
                          const result = analyzePrompt(prompt.content);
                          setOptimizationResults(prev => ({ ...prev, [prompt.id]: result }));
                          setOptimizingPromptId(prompt.id);
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        background: optimizingPromptId === prompt.id ? '#8b5cf6' : '#1c1c22',
                        border: `1px solid ${optimizingPromptId === prompt.id ? '#8b5cf6' : '#2d2d3d'}`,
                        borderRadius: '4px',
                        color: '#d4d4d8',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => {
                        if (optimizingPromptId !== prompt.id) {
                          (e.currentTarget as HTMLButtonElement).style.background = '#2d2d3d';
                        }
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = optimizingPromptId === prompt.id ? '#8b5cf6' : '#1c1c22';
                      }}
                      title="Analyze and optimize this prompt"
                    >
                      <Lightbulb size={12} />
                      Optimize
                    </button>
                    <CopyButton text={prompt.content} />
                  </div>
                </div>
                {/* Prompt body */}
                <div style={{ padding: '16px', background: '#0a0a0d' }}>
                  {optimizingPromptId === prompt.id && optimizationResults[prompt.id] ? (
                    <OptimizationPanel result={optimizationResults[prompt.id]} onClose={() => setOptimizingPromptId(null)} />
                  ) : (
                    <PromptViewer content={prompt.content} />
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {activeTab === 'files' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {task.generatedFiles.length === 0 ? (
              <EmptyTabState message="No supporting files generated for this task type." />
            ) : (
              task.generatedFiles.map(file => {
                const fileColor = getFileTypeColor(file.filename);
                const icon = getFileTypeIcon(file.filename);
                return (
                  <div
                    key={file.id}
                    style={{
                      background: '#0a0a0d',
                      border: `1px solid ${fileColor}33`,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* File Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: `2px solid ${fileColor}33`,
                        background: `linear-gradient(135deg, #0f0f12 0%, ${fileColor}11 100%)`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: fileColor }}>
                          {icon}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          fontFamily: '"JetBrains Mono", monospace',
                          color: fileColor,
                          fontWeight: 600,
                        }}>
                          {file.filename}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          color: '#6b7280',
                          marginLeft: '8px',
                        }}>
                          {Math.round(file.content.length / 1024 * 10) / 10}KB
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => downloadFile(file.filename, file.content)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            background: fileColor + '20',
                            border: `1px solid ${fileColor}40`,
                            borderRadius: '4px',
                            color: fileColor,
                            fontSize: '11px',
                            fontFamily: '"JetBrains Mono", monospace',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = fileColor + '30';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = fileColor + '60';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = fileColor + '20';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = fileColor + '40';
                          }}
                        >
                          <Download size={12} />
                          Download
                        </button>
                        <CopyButton text={file.content} />
                      </div>
                    </div>

                    {/* File Content */}
                    <pre
                      style={{
                        margin: 0,
                        padding: '16px',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '12px',
                        lineHeight: '1.6',
                        color: '#d4d4d8',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        background: '#0f0f12',
                      }}
                    >
                      {file.content}
                    </pre>
                  </div>
                );
              })
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

/* ─── Clarifying Questions ─── */

interface ClarifyQuestion {
  id: string;
  label: string;
  placeholder: string;
  optional?: boolean;
}

const STACKTRACE_RE = /at\s+[\w.<>\[\] /]+\s+\(.*?:\d+:\d+\)|Traceback \(most recent call last\):|at\s+[\w.$]+\.[\w$]+\([\w.]+:\d+\)/;

function analyzeForClarification(input: string): ClarifyQuestion[] {
  // Stack traces are self-describing — no clarification needed
  if (STACKTRACE_RE.test(input)) return [];

  const questions: ClarifyQuestion[] = [];

  const hasStack = /\b(react|next\.?js|vue|angular|svelte|django|fastapi|flask|rails|express|node\.?js|laravel|spring|flutter|kotlin|swift|rust|go\b|golang|python)\b/i.test(input);
  if (!hasStack && input.length > 50) {
    questions.push({
      id: 'stack',
      label: 'What tech stack?',
      placeholder: 'e.g. Next.js + TypeScript, Django + React, or Node.js CLI',
    });
  }

  const mentionsUsers = /\b(user|account|dashboard|admin|login|auth|member|role)\b/i.test(input);
  const hasAuthClarity = /\b(no auth|public|open|nextauth|firebase auth|supabase|clerk|no login|auth0)\b/i.test(input);
  if (mentionsUsers && !hasAuthClarity && questions.length < 2) {
    questions.push({
      id: 'auth',
      label: 'Authentication approach?',
      placeholder: 'e.g. NextAuth + Google, Supabase Auth, or none',
      optional: true,
    });
  }

  if (input.length > 80 && questions.length < 2) {
    const hasConstraints = /\b(offline|no paid|free.?tier|no api key|local.?only|deadline|ship in|within \d|self.?host)\b/i.test(input);
    if (!hasConstraints) {
      questions.push({
        id: 'constraints',
        label: 'Any constraints?',
        placeholder: 'e.g. no paid APIs, must work offline, ship in 2 days',
        optional: true,
      });
    }
  }

  return questions.slice(0, 2);
}

function buildEnrichedInput(baseInput: string, answers: Record<string, string>): string {
  const extras = Object.entries(answers)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => {
      if (k === 'stack') return `Stack: ${v}`;
      if (k === 'auth') return `Auth approach: ${v}`;
      if (k === 'constraints') return `Constraints: ${v}`;
      return `${k}: ${v}`;
    });
  if (extras.length === 0) return baseInput;
  return `${baseInput}\n\nAdditional context:\n${extras.map(e => `- ${e}`).join('\n')}`;
}

interface ClarifyPanelProps {
  questions: ClarifyQuestion[];
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
}

function ClarifyPanel({ questions, answers, onAnswer, onConfirm, onSkip }: ClarifyPanelProps) {
  return (
    <div
      style={{
        background: '#0d1828',
        border: '1px solid #1e3a5f',
        borderRadius: '12px',
        overflow: 'hidden',
        animation: 'slideDown 0.15s ease-out',
      }}
    >
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #1e3a5f',
          background: '#0a1020',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '11px', color: '#93c5fd', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
          Quick questions
        </span>
        <span style={{ fontSize: '10px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>
          — helps generate better prompts
        </span>
      </div>
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {questions.map(q => (
          <div key={q.id}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: '#a1a1aa',
                fontFamily: '"JetBrains Mono", monospace',
                marginBottom: '6px',
              }}
            >
              {q.label}
              {q.optional && (
                <span style={{ color: '#52525b', marginLeft: '6px' }}>optional</span>
              )}
            </label>
            <input
              value={answers[q.id] || ''}
              onChange={e => onAnswer(q.id, e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onConfirm(); }}
              placeholder={q.placeholder}
              style={{
                width: '100%',
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#fafafa',
                fontSize: '13px',
                fontFamily: '"Inter", system-ui, sans-serif',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#3b82f6')}
              onBlur={e => (e.target.style.borderColor = '#27272a')}
              autoFocus={q === questions[0]}
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: '8px', paddingTop: '2px' }}>
          <button
            onClick={onConfirm}
            style={{
              padding: '7px 16px',
              borderRadius: '7px',
              border: 'none',
              background: '#22c55e',
              color: '#000',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: '"Inter", system-ui, sans-serif',
            }}
          >
            Generate
          </button>
          <button
            onClick={onSkip}
            style={{
              padding: '7px 14px',
              borderRadius: '7px',
              border: '1px solid #27272a',
              background: 'transparent',
              color: '#71717a',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: '"Inter", system-ui, sans-serif',
            }}
          >
            Skip
          </button>
        </div>
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
  generateError?: string | null;
  scannedContext?: ScannedContext | null;
  isScanning?: boolean;
  scanError?: string | null;
  onScanProject?: (path: string) => Promise<void>;
  knownIssuesCount?: number;
  activeBackend?: ActiveBackend | null;
  onRefine?: (taskId: string, refinement: string) => Promise<void>;
}

export function CommandCenter({
  onGenerate,
  currentTask,
  isGenerating,
  selectedTask,
  onClearSelection,
  onCancel,
  generateError,
  scannedContext,
  isScanning,
  scanError,
  onScanProject,
  knownIssuesCount = 0,
  activeBackend,
  onRefine,
}: Props) {
  const [input, setInput] = useState('');
  const [projectMode, setProjectMode] = useState<ProjectMode>('new');
  const [projectPath, setProjectPath] = useState('/Users/you/my-project');
  const [activeTab, setActiveTab] = useState<OutputTab>('prompts');
  const [clarifyState, setClarifyState] = useState<'idle' | 'asking'>('idle');
  const [clarifyQuestions, setClarifyQuestions] = useState<ClarifyQuestion[]>([]);
  const [clarifyAnswers, setClarifyAnswers] = useState<Record<string, string>>({});
  const [savedDraft, setSavedDraft] = useState<string | null>(() =>
    localStorage.getItem('prompt-forge-draft')
  );
  const [optimizingPromptId, setOptimizingPromptId] = useState<string | null>(null);
  const [optimizationResults, setOptimizationResults] = useState<Record<string, OptimizationResult>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 240) + 'px';
  }, [input]);

  // Auto-save draft (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.trim()) {
        localStorage.setItem('prompt-forge-draft', input);
      } else {
        localStorage.removeItem('prompt-forge-draft');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [input]);

  // Restore or dismiss draft
  function restoreDraft() {
    if (savedDraft) {
      setInput(savedDraft);
      setSavedDraft(null);
    }
  }

  function dismissDraft() {
    localStorage.removeItem('prompt-forge-draft');
    setSavedDraft(null);
  }

  function doGenerate(baseInput: string, answers: Record<string, string>) {
    const enriched = buildEnrichedInput(baseInput, answers);
    setClarifyState('idle');
    setClarifyQuestions([]);
    setClarifyAnswers({});
    onGenerate(enriched, projectMode === 'existing' ? projectPath : undefined);
    setInput('');
    localStorage.removeItem('prompt-forge-draft');
    setSavedDraft(null);
  }

  function handleSubmit() {
    if (!input.trim() || isGenerating) return;
    if (clarifyState === 'idle') {
      const questions = analyzeForClarification(input.trim());
      if (questions.length > 0) {
        setClarifyQuestions(questions);
        setClarifyAnswers({});
        setClarifyState('asking');
        return;
      }
    }
    doGenerate(input.trim(), clarifyAnswers);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activeBackend && (
            <span
              title={activeBackend.model ?? activeBackend.backend}
              style={{
                fontSize: '10px',
                fontFamily: '"JetBrains Mono", monospace',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid',
                ...(activeBackend.backend === 'anthropic'
                  ? { color: '#93c5fd', borderColor: '#1e3a5f', background: '#1e3a5f55' }
                  : activeBackend.backend === 'ollama'
                  ? { color: '#fb923c', borderColor: '#431407', background: '#43140755' }
                  : { color: '#71717a', borderColor: '#27272a', background: '#27272a55' }),
              }}
            >
              {activeBackend.backend === 'anthropic' && 'Claude API'}
              {activeBackend.backend === 'ollama' && `Ollama · ${activeBackend.model?.split(':')[0] ?? 'local'}`}
              {activeBackend.backend === 'script' && 'Script mode'}
            </span>
          )}
          {currentTask && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>Detected type:</span>
              <TaskTypePill type={currentTask.taskType} size="md" />
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Draft restore banner */}
        {savedDraft && !input && (
          <div
            style={{
              background: '#78350f',
              border: `1px solid #92400e`,
              borderRadius: radius.lg,
              padding: `12px 16px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '13px', color: '#fef3c7', fontWeight: 500 }}>
              📝 You have an unsaved draft
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={restoreDraft}
                style={{
                  padding: '6px 12px',
                  borderRadius: radius.sm,
                  border: '1px solid #b45309',
                  background: '#b45309',
                  color: '#fef3c7',
                  fontSize: '12px',
                  fontFamily: fonts.sans,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: transitions.fast,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#d97706';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#d97706';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#b45309';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#b45309';
                }}
              >
                Restore
              </button>
              <button
                onClick={dismissDraft}
                style={{
                  padding: '6px 12px',
                  borderRadius: radius.sm,
                  border: `1px solid #92400e`,
                  background: 'transparent',
                  color: '#fcd34d',
                  fontSize: '12px',
                  fontFamily: fonts.sans,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: transitions.fast,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#78350f';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

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
              padding: '12px 16px',
              color: '#fafafa',
              fontSize: '14px',
              fontFamily: '"Inter", system-ui, sans-serif',
              lineHeight: '1.5',
              display: 'block',
              verticalAlign: 'top',
            }}
          />
        </div>

        {/* Controls bar (outside textarea) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
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
                  onClick={() => {
                    const p = window.prompt('Enter project path:', projectPath);
                    if (p) {
                      setProjectPath(p);
                      onScanProject?.(p);
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                >
                  change
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

        {/* Clarifying questions panel */}
        {clarifyState === 'asking' && (
          <ClarifyPanel
            questions={clarifyQuestions}
            answers={clarifyAnswers}
            onAnswer={(id, value) => setClarifyAnswers(prev => ({ ...prev, [id]: value }))}
            onConfirm={() => doGenerate(input.trim(), clarifyAnswers)}
            onSkip={() => doGenerate(input.trim(), {})}
          />
        )}

        {/* Project context (when existing mode) */}
        {projectMode === 'existing' && (
          <ProjectContextCard
            scannedContext={scannedContext ?? null}
            isScanning={isScanning ?? false}
            scanError={scanError ?? null}
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

        {/* Tabbed output panel — always visible */}
        {isGenerating ? (
          <GeneratingState />
        ) : generateError ? (
          <div
            style={{
              background: '#1a0a0a',
              border: '1px solid #5f1d1d',
              borderRadius: '12px',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fca5a5', fontFamily: '"JetBrains Mono", monospace' }}>
              Generation failed
            </span>
            <span style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: '1.5' }}>{generateError}</span>
          </div>
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
                onClick={() => exportTaskMarkdown(selectedTask)}
                title="Export as Markdown"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: '1px solid #27272a',
                  color: '#71717a',
                  cursor: 'pointer',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '10px',
                  fontFamily: '"JetBrains Mono", monospace',
                  flexShrink: 0,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#a1a1aa'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#3f3f46'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#71717a'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#27272a'; }}
              >
                <Download size={10} />
                .md
              </button>
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
            {onRefine && <RefinementPanel task={selectedTask} onRefine={onRefine} />}
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
