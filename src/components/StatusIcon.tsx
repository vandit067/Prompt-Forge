import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { TaskStatus } from '../types';

interface Props {
  status: TaskStatus;
  size?: number;
}

export function StatusIcon({ status, size = 14 }: Props) {
  if (status === 'success') return <CheckCircle2 size={size} color="#22c55e" />;
  if (status === 'error')   return <XCircle size={size} color="#ef4444" />;
  return <Clock size={size} color="#71717a" />;
}
