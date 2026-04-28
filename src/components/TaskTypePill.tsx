import type { TaskType } from '../types';
import { TASK_TYPE_CONFIG } from '../types';
import { fonts, radius } from '../lib/designSystem';

interface Props {
  type: TaskType;
  size?: 'sm' | 'md';
}

export function TaskTypePill({ type, size = 'sm' }: Props) {
  const cfg = TASK_TYPE_CONFIG[type];
  const padding = size === 'md' ? '3px 10px' : '2px 8px';
  const fontSize = size === 'md' ? '11px' : '10px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding,
        borderRadius: radius.md,
        fontSize,
        fontFamily: fonts.mono,
        fontWeight: 600,
        letterSpacing: '0.03em',
        color: cfg.color,
        background: cfg.bg,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {cfg.label}
    </span>
  );
}
