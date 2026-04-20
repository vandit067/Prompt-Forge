import { useState } from 'react';
import { Terminal, BarChart3, Settings, Search, X } from 'lucide-react';
import { TaskTypePill } from './TaskTypePill';
import { StatusIcon } from './StatusIcon';
import type { Task, Screen } from '../types';

interface Props {
  tasks: Task[];
  currentScreen: Screen;
  selectedTaskId: string | null;
  onNavigate: (screen: Screen) => void;
  onSelectTask: (taskId: string) => void;
  dbReady?: boolean;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function truncate(text: string, max = 48): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

const NAV_ITEMS = [
  { screen: 'command-center' as Screen, icon: Terminal, label: 'Command Center' },
  { screen: 'analytics' as Screen, icon: BarChart3, label: 'Analytics' },
  { screen: 'settings' as Screen, icon: Settings, label: 'Settings' },
];

export function Sidebar({ tasks, currentScreen, selectedTaskId, onNavigate, onSelectTask, dbReady = true }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'success' | 'error'>('all');

  const filtered = tasks.filter(t => {
    const matchesSearch = search === '' || t.input.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <aside
      style={{
        width: '264px',
        minWidth: '264px',
        height: '100vh',
        background: '#0a0a0d',
        borderRight: '1px solid #1c1c22',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #1c1c22', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6, #22c55e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Terminal size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fafafa', letterSpacing: '-0.01em' }}>
              Prompt Forge
            </div>
            <div style={{ fontSize: '10px', color: '#71717a', fontFamily: '"JetBrains Mono", monospace' }}>
              v0.1.0 — prototype
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '8px 8px', borderBottom: '1px solid #1c1c22', flexShrink: 0 }}>
        {NAV_ITEMS.map(({ screen, icon: Icon, label }) => {
          const active = currentScreen === screen || (screen === 'command-center' && currentScreen === 'task-detail');
          return (
            <button
              key={screen}
              onClick={() => onNavigate(screen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '7px',
                border: 'none',
                background: active ? '#16161a' : 'transparent',
                color: active ? '#fafafa' : '#71717a',
                fontSize: '13px',
                fontFamily: '"Inter", system-ui, sans-serif',
                fontWeight: active ? 500 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.12s, color 0.12s',
                marginBottom: '1px',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#13131a';
                  (e.currentTarget as HTMLButtonElement).style.color = '#d4d4d8';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = '#71717a';
                }
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Search + filter */}
      <div style={{ padding: '10px 12px 8px', flexShrink: 0 }}>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: '#18181b',
            border: '1px solid #1c1c22',
            borderRadius: '7px',
            padding: '0 8px',
          }}
        >
          <Search size={12} color="#71717a" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#fafafa',
              fontSize: '12px',
              fontFamily: '"Inter", system-ui, sans-serif',
              padding: '7px 6px',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#71717a' }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '7px' }}>
          {(['all', 'pending', 'success', 'error'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '2px 8px',
                borderRadius: '5px',
                border: '1px solid',
                fontSize: '10px',
                fontFamily: '"JetBrains Mono", monospace',
                cursor: 'pointer',
                background: statusFilter === s ? '#1c1c22' : 'transparent',
                borderColor: statusFilter === s ? '#3c3c48' : '#1c1c22',
                color: statusFilter === s ? '#fafafa' : '#71717a',
                transition: 'all 0.12s',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Task list header */}
      <div style={{ padding: '4px 12px 6px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '10px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          History — {filtered.length} task{filtered.length !== 1 ? 's' : ''}
        </span>
        {!dbReady && (
          <span style={{ fontSize: '9px', color: '#3b82f6', fontFamily: '"JetBrains Mono", monospace' }}>loading…</span>
        )}
      </div>

      {/* Task list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center', color: '#52525b', fontSize: '12px' }}>
            No tasks found
          </div>
        ) : (
          filtered.map(task => {
            const isSelected = selectedTaskId === task.id && currentScreen === 'task-detail';
            return (
              <button
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                style={{
                  width: '100%',
                  display: 'block',
                  padding: '10px 10px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: isSelected ? '#3b82f6' : 'transparent',
                  background: isSelected ? '#1a2a3d' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: '2px',
                  transition: 'background 0.12s, border-color 0.12s',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.background = '#13131a';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#1c1c22';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                  }
                }}
              >
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '5px' }}>
                  <StatusIcon status={task.status} size={13} />
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#d4d4d8',
                      lineHeight: '1.4',
                      wordBreak: 'break-word',
                      flex: 1,
                    }}
                  >
                    {truncate(task.title)}
                  </span>
                </div>
                {/* Meta row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '19px' }}>
                  <TaskTypePill type={task.taskType} size="sm" />
                  <span style={{ fontSize: '10px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace', marginLeft: 'auto' }}>
                    {formatRelativeTime(task.createdAt)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
