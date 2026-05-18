import { useState } from 'react';
import { Terminal, BarChart3, Settings, Search, X } from 'lucide-react';
import { colors, fonts, radius, space, transitions } from '../lib/designSystem';
import { TaskTypePill } from './TaskTypePill';
import { StatusIcon } from './StatusIcon';
import type { Task, Screen, TaskType } from '../types';
import { TASK_TYPE_CONFIG } from '../types';

interface Props {
  tasks: Task[];
  currentScreen: Screen;
  selectedTaskId: string | null;
  onNavigate: (screen: Screen) => void;
  onSelectTask: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => Promise<void>;
  onClearAllTasks?: () => Promise<void>;
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

function truncate(text: string, max = 46): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

const NAV_ITEMS = [
  { screen: 'command-center' as Screen, icon: Terminal, label: 'Command Center' },
  { screen: 'analytics' as Screen, icon: BarChart3, label: 'Analytics' },
  { screen: 'settings' as Screen, icon: Settings, label: 'Settings' },
];

const ALL_TYPES = Object.keys(TASK_TYPE_CONFIG) as TaskType[];

export function Sidebar({ tasks, currentScreen, selectedTaskId, onNavigate, onSelectTask, onDeleteTask, onClearAllTasks, dbReady = true }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'success' | 'error'>('all');
  const [typeFilter, setTypeFilter] = useState<TaskType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const filtered = tasks.filter(t => {
    const matchesSearch = search === '' ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.input.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesType = typeFilter === 'all' || t.taskType === typeFilter;

    const matchesDate = (() => {
      if (dateFilter === 'all') return true;
      const now = new Date();
      const created = new Date(t.createdAt);
      if (dateFilter === 'today') return created.toDateString() === now.toDateString();
      if (dateFilter === 'week') return (now.getTime() - created.getTime()) < 7 * 86400000;
      if (dateFilter === 'month') return (now.getTime() - created.getTime()) < 30 * 86400000;
      return true;
    })();

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  const sorted = [...filtered].sort((a, b) =>
    sortOrder === 'newest'
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFilter('all');
  }

  const hasActiveFilter = search !== '' || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all';

  return (
    <aside
      style={{
        width: '264px',
        minWidth: '264px',
        height: '100vh',
        background: colors.bgMuted,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: space.md }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: radius.md,
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
            <div style={{ fontSize: '13px', fontWeight: 600, color: colors.fg, letterSpacing: '-0.01em' }}>
              Prompt Forge
            </div>
            <div style={{ fontSize: '10px', color: colors.fgMuted, fontFamily: fonts.mono }}>
              v0.1.0 — prototype
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: space.sm, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
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

      {/* Search */}
      <div style={{ padding: '10px 12px 0', flexShrink: 0 }}>
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
            placeholder="Search by title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
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
      </div>

      {/* Status filter */}
      <div style={{ padding: '8px 12px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '4px' }}>
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

      {/* Task type filter — horizontally scrollable */}
      <div
        style={{
          padding: '6px 12px 8px',
          flexShrink: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <div style={{ display: 'flex', gap: '4px', width: 'max-content' }}>
          {/* "All types" reset pill */}
          <button
            onClick={() => setTypeFilter('all')}
            style={{
              padding: '2px 8px',
              borderRadius: '5px',
              border: '1px solid',
              fontSize: '10px',
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer',
              background: typeFilter === 'all' ? '#1c1c22' : 'transparent',
              borderColor: typeFilter === 'all' ? '#3c3c48' : '#1c1c22',
              color: typeFilter === 'all' ? '#fafafa' : '#71717a',
              transition: 'all 0.12s',
              whiteSpace: 'nowrap',
            }}
          >
            all types
          </button>
          {ALL_TYPES.map(type => {
            const cfg = TASK_TYPE_CONFIG[type];
            const active = typeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(active ? 'all' : type)}
                style={{
                  padding: '2px 7px',
                  borderRadius: '5px',
                  border: `1px solid ${active ? cfg.color + '60' : '#1c1c22'}`,
                  fontSize: '10px',
                  fontFamily: '"JetBrains Mono", monospace',
                  cursor: 'pointer',
                  background: active ? cfg.bg : 'transparent',
                  color: active ? cfg.color : '#52525b',
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date filter */}
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0, overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '4px', minWidth: 'min-content' }}>
          {(['all', 'today', 'week', 'month'] as const).map(date => {
            const labels = { all: 'All time', today: 'Today', week: 'This week', month: 'This month' };
            const active = dateFilter === date;
            return (
              <button
                key={date}
                onClick={() => setDateFilter(active ? 'all' : date)}
                style={{
                  padding: '2px 7px',
                  borderRadius: '5px',
                  border: `1px solid ${active ? colors.blue + '60' : colors.border}`,
                  fontSize: '10px',
                  fontFamily: fonts.mono,
                  cursor: 'pointer',
                  background: active ? colors.blueBg : 'transparent',
                  color: active ? colors.blueLight : colors.fgDim,
                  transition: transitions.fast,
                  whiteSpace: 'nowrap',
                }}
              >
                {labels[date]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task list header */}
      <div style={{ padding: '2px 12px 6px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '10px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {sorted.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
        {!dbReady && (
          <span style={{ fontSize: '9px', color: '#3b82f6', fontFamily: '"JetBrains Mono", monospace' }}>loading…</span>
        )}
        <button
          onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          title={`Sort: ${sortOrder === 'newest' ? 'newest first' : 'oldest first'}`}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: '#52525b',
            fontSize: '10px',
            cursor: 'pointer',
            fontFamily: '"JetBrains Mono", monospace',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            transition: transitions.fast,
          }}
        >
          {sortOrder === 'newest' ? '↓' : '↑'}
        </button>
        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            style={{
              background: 'none',
              border: 'none',
              color: '#52525b',
              fontSize: '10px',
              cursor: 'pointer',
              fontFamily: '"JetBrains Mono", monospace',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <X size={10} /> clear
          </button>
        )}
        {onClearAllTasks && tasks.length > 0 && (
          <button
            onClick={() => setShowClearAllConfirm(true)}
            disabled={isClearing}
            style={{
              background: 'none',
              border: 'none',
              color: '#52525b',
              fontSize: '10px',
              cursor: isClearing ? 'not-allowed' : 'pointer',
              fontFamily: '"JetBrains Mono", monospace',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              opacity: isClearing ? 0.6 : 1,
            }}
          >
            <X size={10} /> clear all
          </button>
        )}
      </div>

      {/* Task list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
        {sorted.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center', color: '#52525b', fontSize: '12px' }}>
            {tasks.length === 0 ? 'No tasks yet — submit your first request' : 'No tasks match filters'}
          </div>
        ) : (
          sorted.map(task => {
            const isSelected = selectedTaskId === task.id;
            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTask(task.id);
                  }
                }}
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
                    (e.currentTarget as HTMLDivElement).style.background = '#13131a';
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#1c1c22';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
                  }
                }}
              >
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '5px' }}>
                  <StatusIcon status={task.status} size={13} />
                  <span
                    style={{
                      fontSize: '12px',
                      color: isSelected ? '#fafafa' : '#d4d4d8',
                      lineHeight: '1.4',
                      wordBreak: 'break-word',
                      flex: 1,
                      fontWeight: isSelected ? 500 : 400,
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
                  {onDeleteTask && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete task: ${task.title}?`)) {
                          onDeleteTask(task.id);
                        }
                      }}
                      title="Delete task (click to confirm)"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#71717a',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        lineHeight: 1,
                        borderRadius: '4px',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        const btn = e.currentTarget as HTMLButtonElement;
                        btn.style.color = '#ef4444';
                        btn.style.background = '#1c1c22';
                      }}
                      onMouseLeave={e => {
                        const btn = e.currentTarget as HTMLButtonElement;
                        btn.style.color = '#71717a';
                        btn.style.background = 'none';
                      }}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clear All Confirmation Dialog */}
      {showClearAllConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !isClearing && setShowClearAllConfirm(false)}
        >
          <div
            style={{
              background: colors.bgMuted,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.lg,
              padding: space.lg,
              width: '100%',
              maxWidth: '320px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: colors.fg }}>
              Clear All Tasks?
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: colors.fgDim, lineHeight: 1.5 }}>
              This will permanently delete all {tasks.length} task{tasks.length !== 1 ? 's' : ''}. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: space.sm, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearAllConfirm(false)}
                disabled={isClearing}
                style={{
                  padding: '6px 12px',
                  borderRadius: radius.md,
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.fg,
                  fontSize: '12px',
                  cursor: isClearing ? 'not-allowed' : 'pointer',
                  fontFamily: fonts.mono,
                  transition: transitions.fast,
                  opacity: isClearing ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsClearing(true);
                  try {
                    if (onClearAllTasks) {
                      await onClearAllTasks();
                    }
                  } finally {
                    setShowClearAllConfirm(false);
                    setIsClearing(false);
                  }
                }}
                disabled={isClearing}
                style={{
                  padding: '6px 12px',
                  borderRadius: radius.md,
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: isClearing ? 'not-allowed' : 'pointer',
                  fontFamily: fonts.mono,
                  fontWeight: 600,
                  transition: transitions.fast,
                  opacity: isClearing ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isClearing) (e.currentTarget as HTMLButtonElement).style.background = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#ef4444';
                }}
              >
                {isClearing ? 'Clearing…' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
