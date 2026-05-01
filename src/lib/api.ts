import type { Task, TaskType, ActiveBackend, ScannedContext } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  getTasks: () =>
    request<Task[]>('/api/tasks'),

  saveTask: (task: Task) =>
    request<{ ok: boolean }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  updateStatus: (id: string, status: 'success' | 'error', errorNotes?: string) =>
    request<{ ok: boolean }>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, errorNotes }),
    }),

  getSettings: () =>
    request<Record<string, string>>('/api/settings'),

  saveSettings: (settings: Record<string, string>) =>
    request<{ ok: boolean }>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),

  generate: (input: string, taskType: TaskType, projectPath?: string, projectContext?: ScannedContext | null) =>
    request<Task>('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ input, taskType, projectPath, projectContext }),
      signal: AbortSignal.timeout(180_000),
    } as RequestInit),

  getBackend: () =>
    request<ActiveBackend>('/api/backend'),
};
