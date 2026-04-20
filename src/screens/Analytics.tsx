import type { Task, TaskType } from '../types';
import { TASK_TYPE_CONFIG } from '../types';
import { TrendingUp, CheckCircle2, XCircle, Clock, BarChart3 } from 'lucide-react';
import { colors, fonts, radius, space, transitions } from '../lib/designSystem';

interface Props {
  tasks: Task[];
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.xl,
        padding: space.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: space.xs,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: colors.fgMuted, fontFamily: fonts.sans }}>{label}</span>
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '7px',
            background: `${color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: colors.fg, fontFamily: fonts.mono, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '11px', color: colors.fgDim, fontFamily: fonts.mono }}>{sub}</div>}
    </div>
  );
}

function TypeBar({ type, count, maxCount }: { type: TaskType; count: number; maxCount: number }) {
  const cfg = TASK_TYPE_CONFIG[type];
  const pct = maxCount === 0 ? 0 : Math.round((count / maxCount) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '110px', flexShrink: 0 }}>
        <span
          style={{
            display: 'inline-flex',
            padding: '2px 7px',
            borderRadius: '5px',
            fontSize: '10px',
            fontFamily: '"JetBrains Mono", monospace',
            color: cfg.color,
            background: cfg.bg,
          }}
        >
          {cfg.label}
        </span>
      </div>
      <div style={{ flex: 1, height: '8px', background: '#18181b', borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: cfg.color,
            borderRadius: '4px',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span style={{ width: '28px', textAlign: 'right', fontSize: '11px', color: '#71717a', fontFamily: '"JetBrains Mono", monospace', flexShrink: 0 }}>
        {count}
      </span>
    </div>
  );
}

function WeeklyTrendChart({ data }: { data: { week: string; rate: number; successes: number; total: number }[] }) {
  if (data.length === 0) return <p style={{ color: '#52525b', fontSize: '12px' }}>No task history yet.</p>;

  const maxRate = 100;
  const chartHeight = 120;
  const chartWidth = data.length > 0 ? 100 / data.length : 100;
  const points = data.map((d, i) => {
    const x = (i + 0.5) * chartWidth;
    const y = chartHeight - (d.rate / maxRate) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <svg
        viewBox={`0 0 100 ${chartHeight + 20}`}
        style={{ width: '100%', height: '140px' }}
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => (
          <line
            key={`grid-${v}`}
            x1="0"
            y1={chartHeight - (v / 100) * chartHeight}
            x2="100"
            y2={chartHeight - (v / 100) * chartHeight}
            stroke="#18181b"
            strokeWidth="0.5"
          />
        ))}

        {/* Area fill */}
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`}
          fill="#3b82f622"
        />

        {/* Line */}
        <path d={pathD} stroke="#3b82f6" strokeWidth="1.5" fill="none" />

        {/* Points */}
        {points.map((p, i) => (
          <circle key={`point-${i}`} cx={p.x} cy={p.y} r="1.5" fill="#3b82f6" />
        ))}

        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map(v => (
          <text
            key={`label-${v}`}
            x="2"
            y={chartHeight - (v / 100) * chartHeight + 3}
            fontSize="8"
            fill="#52525b"
          >
            {v}%
          </text>
        ))}
      </svg>

      {/* Week labels and values */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
        {data.map(d => (
          <div key={d.week} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>
              {d.week}
            </div>
            <div style={{ fontSize: '10px', color: '#22c55e', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
              {d.rate}%
            </div>
            <div style={{ fontSize: '8px', color: '#71717a', fontFamily: '"JetBrains Mono", monospace' }}>
              {d.successes}/{d.total}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Analytics({ tasks }: Props) {
  const total = tasks.length;
  const successes = tasks.filter(t => t.status === 'success').length;
  const errors = tasks.filter(t => t.status === 'error').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const successRate = total === 0 ? 0 : Math.round((successes / total) * 100);

  // Type breakdown
  const typeCounts = tasks.reduce<Partial<Record<TaskType, number>>>((acc, t) => {
    acc[t.taskType] = (acc[t.taskType] ?? 0) + 1;
    return acc;
  }, {});
  const sortedTypes = (Object.keys(typeCounts) as TaskType[]).sort(
    (a, b) => (typeCounts[b] ?? 0) - (typeCounts[a] ?? 0)
  );
  const maxTypeCount = Math.max(0, ...Object.values(typeCounts).filter((v): v is number => v !== undefined));

  // Common failures
  const failures = tasks
    .filter(t => t.status === 'error' && t.errorNotes)
    .map(t => ({ type: t.taskType, notes: t.errorNotes!, date: t.createdAt }))
    .slice(0, 5);

  // Weekly success rate trend
  const weeklyData = tasks.length === 0 ? [] : (() => {
    const now = new Date();
    const weeks: { week: string; successes: number; total: number; rate: number }[] = [];

    // Calculate past 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekTasks = tasks.filter(t => {
        const date = new Date(t.createdAt);
        return date >= weekStart && date < weekEnd;
      });

      if (weekTasks.length > 0) {
        const weekSuccesses = weekTasks.filter(t => t.status === 'success').length;
        weeks.push({
          week: `Week ${7 - i}`,
          successes: weekSuccesses,
          total: weekTasks.length,
          rate: Math.round((weekSuccesses / weekTasks.length) * 100),
        });
      }
    }

    return weeks.length > 0 ? weeks : [];
  })();

  // Most used project paths
  const pathCounts = tasks
    .filter(t => t.projectPath)
    .reduce<Record<string, number>>((acc, t) => {
      if (t.projectPath) {
        acc[t.projectPath] = (acc[t.projectPath] ?? 0) + 1;
      }
      return acc;
    }, {});
  const topPaths = Object.entries(pathCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([path, count]) => ({ path, count }));

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
        <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fafafa' }}>Analytics</h1>
        <p style={{ margin: 0, fontSize: '11px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>
          Task history insights and success patterns
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <StatCard
            label="Total Tasks"
            value={total}
            sub="all time"
            color="#3b82f6"
            icon={<BarChart3 size={14} color="#3b82f6" />}
          />
          <StatCard
            label="Success Rate"
            value={`${successRate}%`}
            sub={`${successes} of ${total} tasks`}
            color="#22c55e"
            icon={<TrendingUp size={14} color="#22c55e" />}
          />
          <StatCard
            label="Successes"
            value={successes}
            sub="marked as worked"
            color="#22c55e"
            icon={<CheckCircle2 size={14} color="#22c55e" />}
          />
          <StatCard
            label="Errors"
            value={errors}
            sub={`${pending} pending`}
            color="#ef4444"
            icon={<XCircle size={14} color="#ef4444" />}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Type breakdown */}
          <div
            style={{
              background: '#0f0f12',
              border: '1px solid #1c1c22',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: '#fafafa' }}>
              Tasks by Type
            </h2>
            {sortedTypes.length === 0 ? (
              <p style={{ color: '#52525b', fontSize: '12px' }}>No tasks yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sortedTypes.map(type => (
                  <TypeBar key={type} type={type} count={typeCounts[type] ?? 0} maxCount={maxTypeCount} />
                ))}
              </div>
            )}
          </div>

          {/* Weekly improvement trend */}
          <div
            style={{
              background: '#0f0f12',
              border: '1px solid #1c1c22',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: '#fafafa' }}>
              Success Rate Trend
            </h2>
            <WeeklyTrendChart data={weeklyData} />
          </div>
        </div>

        {/* Most used project paths */}
        {topPaths.length > 0 && (
          <div
            style={{
              background: '#0f0f12',
              border: '1px solid #1c1c22',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: '#fafafa' }}>
              Most Used Project Paths
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topPaths.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    background: '#0a0a0d',
                    borderRadius: '7px',
                    border: '1px solid #1c1c22',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: '#3b82f622',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '10px',
                      color: '#3b82f6',
                      fontWeight: 600,
                      fontFamily: '"JetBrains Mono", monospace',
                    }}
                  >
                    {item.count}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#fafafa',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    >
                      {item.path}
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#52525b', flexShrink: 0 }}>
                    {item.count} task{item.count !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Common failures */}
        <div
          style={{
            background: '#0f0f12',
            border: '1px solid #1c1c22',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <h2 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: '#fafafa' }}>
            Common Failure Patterns
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: '11px', color: '#52525b', fontFamily: '"JetBrains Mono", monospace' }}>
            These notes are prepended to future prompts of the same type.
          </p>
          {failures.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#52525b', fontSize: '12px' }}>
              No failures recorded yet — mark tasks as "Error" with notes to populate this.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {failures.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    background: '#200d0d',
                    border: '1px solid #5f1d1d',
                    borderRadius: '8px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ fontSize: '10px', color: '#ef4444', fontFamily: '"JetBrains Mono", monospace', background: '#5f1d1d', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, marginTop: '1px' }}>
                    {TASK_TYPE_CONFIG[f.type].label}
                  </span>
                  <span style={{ fontSize: '12px', color: '#fca5a5', lineHeight: '1.5', fontFamily: '"JetBrains Mono", monospace' }}>
                    {f.notes}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending tasks */}
        {pending > 0 && (
          <div
            style={{
              background: '#0f0f12',
              border: '1px solid #1c1c22',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Clock size={16} color="#71717a" />
            <span style={{ fontSize: '13px', color: '#71717a' }}>
              <strong style={{ color: '#fafafa' }}>{pending}</strong> task{pending !== 1 ? 's' : ''} awaiting feedback — mark them as Worked or Error to improve future prompts.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
