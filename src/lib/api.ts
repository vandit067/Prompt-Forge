import type { Task, TaskType } from '../types';

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

  generate: (input: string, taskType: TaskType, projectPath?: string) =>
    request<Task>('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ input, taskType, projectPath }),
      // Claude with adaptive thinking can take up to ~60s
      signal: AbortSignal.timeout(90_000),
    } as RequestInit),
};
