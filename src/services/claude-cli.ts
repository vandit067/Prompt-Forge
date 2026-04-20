import type { Task, ScannedContext } from '../types';

export class CliNotInstalledError extends Error {
  constructor() {
    super('CLI_NOT_INSTALLED');
    this.name = 'CliNotInstalledError';
  }
}

export class GenerationCancelledError extends Error {
  constructor() {
    super('Generation was cancelled');
    this.name = 'GenerationCancelledError';
  }
}

export async function scanProject(folderPath: string): Promise<ScannedContext> {
  const res = await fetch('/api/scan-project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: folderPath }),
  });

  if (res.status === 404) throw new Error('Folder not found');
  if (res.status === 400) {
    const body = await res.json();
    throw new Error(body.error || 'Invalid path');
  }
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || `Scan failed: HTTP ${res.status}`);
  }

  return res.json() as Promise<ScannedContext>;
}

export async function generateTask(
  input: string,
  projectPath: string | undefined,
  scannedContext: ScannedContext | null,
  signal: AbortSignal
): Promise<Task> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, projectPath, projectContext: scannedContext }),
    signal,
  });

  // Handle specific error codes
  if (res.status === 422) {
    const body = await res.json();
    if (body.error === 'CLI_NOT_INSTALLED') {
      throw new CliNotInstalledError();
    }
  }

  if (res.status === 499) {
    throw new GenerationCancelledError();
  }

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || `Generation failed: HTTP ${res.status}`);
  }

  return res.json() as Promise<Task>;
}
