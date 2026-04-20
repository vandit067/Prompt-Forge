import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = join(__dirname, '..', 'ORCHESTRATOR_RULES.md');

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export async function spawnClaude(userInput, { onAbort, projectContext, knownIssues } = {}) {
  let rules;
  try {
    rules = readFileSync(RULES_PATH, 'utf8');
  } catch (err) {
    throw { code: 'RULES_NOT_FOUND', message: err.message };
  }

  let contextBlock = '';
  if (projectContext) {
    contextBlock = `\n\n---\n\n${projectContext}\n`;
  }

  let knownIssuesBlock = '';
  if (knownIssues) {
    knownIssuesBlock = `\n\n---\n\n${knownIssues}\n`;
  }

  const prompt = `${rules}${contextBlock}${knownIssuesBlock}\n\n---\n\nTASK:\n${userInput}`;

  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p', prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000, // 2 min timeout
    });

    if (onAbort) onAbort(() => proc.kill('SIGTERM'));

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject({ code: 'CLI_NOT_INSTALLED' });
      } else {
        reject({ code: 'SPAWN_ERROR', message: err.message });
      }
    });

    proc.on('close', (code) => {
      // code === null means process was killed
      if (code === null) {
        reject({ code: 'CANCELLED' });
        return;
      }

      if (code !== 0) {
        reject({
          code: 'CLI_ERROR',
          stderr: stderr || 'Claude CLI exited with error code ' + code,
        });
        return;
      }

      // Try to extract JSON from output
      // Claude might wrap in markdown fences or add extra text
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        reject({
          code: 'PARSE_ERROR',
          raw: stdout,
          message: 'No JSON found in output',
        });
        return;
      }

      try {
        const parsed = JSON.parse(jsonMatch[0]);
        resolve(parsed);
      } catch (err) {
        reject({
          code: 'PARSE_ERROR',
          raw: stdout,
          message: 'JSON parse failed: ' + err.message,
        });
      }
    });
  });
}

export function classifyTaskType(data) {
  if (data.taskType) return data.taskType;
  const lower = (data.title || '').toLowerCase();
  if (/\b(build|create|scaffold|make|new)\b/.test(lower)) return 'NEW_TOOL';
  if (/\b(broken|error|crash|bug|fix)\b/.test(lower)) return 'BUG_FIX';
  if (/\b(review|check|audit)\b/.test(lower)) return 'CODE_REVIEW';
  return 'NEW_FEATURE';
}

export function buildTask(parsed, userInput, projectPath, projectContext) {
  const now = new Date().toISOString();
  const taskType = classifyTaskType(parsed);

  // Ensure arrays are present
  const prompts = (parsed.generatedPrompts || []).map((p, i) => ({
    id: uid(),
    sessionLabel: p.sessionLabel || `Session ${i + 1}`,
    content: p.content || '',
  }));

  const files = (parsed.generatedFiles || []).map((f) => ({
    id: uid(),
    filename: f.filename || `file-${uid()}.txt`,
    content: f.content || '',
  }));

  const plan = (parsed.generatedPlan || []).map((step) => ({
    session: step.session || 0,
    title: step.title || 'Unnamed Step',
    description: step.description || '',
    estimatedTime: step.estimatedTime || '30 min',
  }));

  const checklist = (parsed.generatedChecklist || []).map((item) =>
    typeof item === 'string' ? item : String(item)
  );

  return {
    id: `task-${uid()}`,
    title: parsed.title
      ? parsed.title.slice(0, 55)
      : userInput.split('\n')[0].slice(0, 55),
    input: userInput,
    taskType,
    projectPath: projectPath || undefined,
    projectContext: projectContext?.promptBlock || undefined,
    generatedPrompts: prompts,
    generatedFiles: files,
    generatedPlan: plan,
    generatedChecklist: checklist,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

// Fallback when JSON parsing fails — show raw output as a single prompt
export function buildFallbackTask(userInput, rawOutput, projectPath, projectContext) {
  const now = new Date().toISOString();
  const uid_ = uid();

  return {
    id: `task-${uid()}`,
    title: userInput.split('\n')[0].slice(0, 55),
    input: userInput,
    taskType: 'NEW_FEATURE',
    projectPath: projectPath || undefined,
    projectContext: projectContext?.promptBlock || null,
    generatedPrompts: [
      {
        id: uid_,
        sessionLabel: 'Claude Output (Raw)',
        content: rawOutput.slice(0, 5000), // cap at 5000 chars
      },
    ],
    generatedFiles: [],
    generatedPlan: [
      {
        session: 1,
        title: 'Execute',
        description: 'Follow the Claude Code guidance above',
        estimatedTime: '30 min',
      },
    ],
    generatedChecklist: [
      'Review the output above for task details',
      'Execute the steps as recommended',
    ],
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}
