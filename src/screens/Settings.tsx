import { useState } from 'react';
import { Terminal, Download, Upload, RotateCcw, CheckCircle2 } from 'lucide-react';
import { colors, fonts, radius, space, transitions } from '../lib/designSystem';
import type { Task } from '../types';

interface Props {
  tasks: Task[];
  onImport: (tasks: Task[]) => void;
  onResetPatterns: () => void;
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.xl,
        padding: space.lg,
      }}
    >
      <h2 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: colors.fg }}>{title}</h2>
      {subtitle && <p style={{ margin: '0 0 16px', fontSize: '11px', color: colors.fgDim, fontFamily: fonts.mono }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: '16px' }} />}
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
      <label style={{ width: '160px', flexShrink: 0, fontSize: '12px', color: '#71717a', fontFamily: '"Inter", system-ui, sans-serif' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SettingsInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        flex: 1,
        background: '#18181b',
        border: '1px solid #1c1c22',
        borderRadius: '7px',
        padding: '7px 10px',
        color: '#fafafa',
        fontSize: '12px',
        fontFamily: '"JetBrains Mono", monospace',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => (e.target.style.borderColor = '#3b82f6')}
      onBlur={e => (e.target.style.borderColor = '#1c1c22')}
    />
  );
}

function CheckboxRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 10px',
        borderRadius: '7px',
        cursor: 'pointer',
        background: checked ? '#0f1f1a' : 'transparent',
        border: '1px solid',
        borderColor: checked ? '#14532d' : 'transparent',
        marginBottom: '6px',
        transition: 'all 0.12s',
        userSelect: 'none',
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
          transition: 'all 0.12s',
        }}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: '12px', color: checked ? '#d4d4d8' : '#71717a', fontFamily: '"Inter", system-ui, sans-serif' }}>
        {label}
      </span>
    </label>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  variant = 'default',
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '7px',
        border: '1px solid',
        borderColor: variant === 'danger' ? '#5f1d1d' : '#1c1c22',
        background: variant === 'danger' ? '#200d0d' : '#18181b',
        color: variant === 'danger' ? '#ef4444' : '#a1a1aa',
        fontSize: '12px',
        fontFamily: '"Inter", system-ui, sans-serif',
        cursor: 'pointer',
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.color = variant === 'danger' ? '#fca5a5' : '#fafafa';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.color = variant === 'danger' ? '#ef4444' : '#a1a1aa';
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export function Settings({ tasks, onImport, onResetPatterns }: Props) {
  const [cliPath, setCliPath] = useState('claude');
  const [defaultPath, setDefaultPath] = useState('');
  const [constraints, setConstraints] = useState({
    noAPIs: true,
    mockFirst: true,
    tsStrict: true,
    smallCommits: true,
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-forge-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target?.result as string) as Task[];
          onImport(data);
        } catch {
          alert('Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleReset() {
    if (window.confirm('Reset all learned failure patterns? This cannot be undone.')) {
      onResetPatterns();
    }
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fafafa' }}>Settings</h1>
          <p style={{ margin: 0, fontSize: '11px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>
            Configure CLI path, defaults, and data management
          </p>
        </div>
        <button
          onClick={handleSave}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '7px',
            border: 'none',
            background: saved ? '#14532d' : '#22c55e',
            color: saved ? '#86efac' : '#000',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: '"Inter", system-ui, sans-serif',
            transition: 'all 0.15s',
          }}
        >
          {saved ? <><CheckCircle2 size={13} /> Saved</> : 'Save Settings'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* CLI Config */}
        <SectionCard title="Claude Code CLI" subtitle="Path to the claude CLI binary used for prompt generation.">
          <FieldRow label="CLI Path">
            <SettingsInput value={cliPath} onChange={setCliPath} placeholder="claude" />
            <button
              style={{
                padding: '7px 12px',
                background: '#18181b',
                border: '1px solid #1c1c22',
                borderRadius: '7px',
                color: '#71717a',
                fontSize: '11px',
                fontFamily: '"JetBrains Mono", monospace',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Auto-detect
            </button>
          </FieldRow>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#0a0a0d', borderRadius: '7px', border: '1px solid #1c1c22' }}>
            <Terminal size={13} color="#71717a" />
            <span style={{ fontSize: '11px', color: '#71717a', fontFamily: '"JetBrains Mono", monospace' }}>
              Status: <span style={{ color: '#22c55e' }}>● CLI found at /usr/local/bin/claude</span>
            </span>
          </div>
          <FieldRow label="Default Project Path">
            <SettingsInput value={defaultPath} onChange={setDefaultPath} placeholder="~/projects" />
          </FieldRow>
        </SectionCard>

        {/* Default Constraints */}
        <SectionCard title="Default Constraints" subtitle="Prepended to every generated prompt unless overridden.">
          <CheckboxRow label="No paid APIs — all processing must be local" checked={constraints.noAPIs} onChange={v => setConstraints(c => ({ ...c, noAPIs: v }))} />
          <CheckboxRow label="Mock-first for external data sources" checked={constraints.mockFirst} onChange={v => setConstraints(c => ({ ...c, mockFirst: v }))} />
          <CheckboxRow label="TypeScript strict mode, Zod at all boundaries" checked={constraints.tsStrict} onChange={v => setConstraints(c => ({ ...c, tsStrict: v }))} />
          <CheckboxRow label="Small commits per step" checked={constraints.smallCommits} onChange={v => setConstraints(c => ({ ...c, smallCommits: v }))} />
        </SectionCard>

        {/* Data Management */}
        <SectionCard title="Data Management" subtitle="Export history, import previous sessions, reset learned patterns.">
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <ActionButton label={`Export History (${tasks.length} tasks)`} icon={<Download size={13} />} onClick={handleExport} />
            <ActionButton label="Import History" icon={<Upload size={13} />} onClick={handleImport} />
          </div>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1c1c22' }}>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#71717a' }}>
              Learned failure patterns are stored from tasks you mark as "Error". Reset clears all patterns but keeps task history.
            </p>
            <ActionButton
              label="Reset Learned Patterns"
              icon={<RotateCcw size={13} />}
              onClick={handleReset}
              variant="danger"
            />
          </div>
        </SectionCard>

        {/* About */}
        <div
          style={{
            background: '#0f0f12',
            border: '1px solid #1c1c22',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#71717a' }}>Prompt Forge</div>
            <div style={{ fontSize: '11px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace', marginTop: '2px' }}>
              v0.1.0 — prototype · local-only · no cloud · no paid APIs
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace', textAlign: 'right' }}>
            <div>Electron + Vite + React 18</div>
            <div>TypeScript + SQLite</div>
          </div>
        </div>
      </div>
    </div>
  );
}
