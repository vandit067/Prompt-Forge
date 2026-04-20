import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { colors } from '../lib/designSystem';
import type { TaskStatus } from '../types';

interface Props {
  status: TaskStatus;
  size?: number;
}

export function StatusIcon({ status, size = 14 }: Props) {
  if (status === 'success') return <CheckCircle2 size={size} color={colors.success} />;
  if (status === 'error')   return <XCircle size={size} color={colors.error} />;
  return <Clock size={size} color={colors.fgMuted} />;
}
