import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

export async function scanProject(folderPath) {
  let stats;
  try {
    stats = statSync(folderPath);
    if (!stats.isDirectory()) throw { code: 'NOT_DIRECTORY', message: 'Path is not a directory' };
  } catch (err) {
    if (err.code === 'ENOENT') throw { code: 'NOT_FOUND', message: 'Folder not found' };
    throw err;
  }

  const spec    = readSafe(join(folderPath, 'SPEC.md'));
  const claude  = readSafe(join(folderPath, 'CLAUDE.md'));
  const prompts = readSafe(join(folderPath, 'PROMPTS.md'));
  const readme  = readSafe(join(folderPath, 'README.md'));

  const pkg          = readJsonSafe(join(folderPath, 'package.json'));
  const requirements = readSafe(join(folderPath, 'requirements.txt'));

  const techStack    = detectTechStack(pkg, requirements);
  const packageMgr   = detectPackageManager(folderPath, pkg);
  const scripts      = extractScripts(pkg);
  const hooks        = detectHooks(folderPath);

  const specPurpose  = spec   ? extractSpecPurpose(spec)   : undefined;
  // Keep ALL rules — the system prompt needs the full list
  const rules        = claude ? extractRules(claude)        : [];

  const keyFiles = [
    { filename: 'SPEC.md',           found: !!spec },
    { filename: 'CLAUDE.md',         found: !!claude },
    { filename: 'PROMPTS.md',        found: !!prompts },
    { filename: 'README.md',         found: !!readme },
    { filename: 'package.json',      found: !!pkg },
    { filename: 'requirements.txt',  found: !!requirements },
  ];

  const hasCompanionFiles = !!spec || !!claude;
  const tree = twoLevelTree(folderPath);

  const promptBlock = buildPromptBlock({
    projectPath: folderPath,
    techStack,
    packageMgr,
    scripts,
    hooks,
    keyFiles,
    rules,
    specPurpose,
    hasCompanionFiles,
    tree,
  });

  return {
    projectPath: folderPath,
    techStack,
    packageMgr,
    scripts,
    hooks,
    keyFiles,
    rules,
    specPurpose,
    hasCompanionFiles,
    promptBlock,
  };
}

function readSafe(filePath) {
  try { return readFileSync(filePath, 'utf8'); } catch { return null; }
}

function readJsonSafe(filePath) {
  const c = readSafe(filePath);
  if (!c) return null;
  try { return JSON.parse(c); } catch { return null; }
}

function detectTechStack(pkg, requirements) {
  const stack = new Set();

  if (pkg) {
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (deps.typescript)                       stack.add('TypeScript');
    if (deps.react)                            stack.add('React');
    if (deps['react-dom'])                     stack.add('React DOM');
    if (deps.vue)                              stack.add('Vue');
    if (deps.svelte)                           stack.add('Svelte');
    if (deps.next)                             stack.add('Next.js');
    if (deps.nuxt)                             stack.add('Nuxt');
    if (deps.express)                          stack.add('Express');
    if (deps.fastify)                          stack.add('Fastify');
    if (deps['@nestjs/core'])                  stack.add('NestJS');
    if (deps.vite)                             stack.add('Vite');
    if (deps.webpack)                          stack.add('Webpack');
    if (deps.vitest)                           stack.add('Vitest');
    if (deps.jest)                             stack.add('Jest');
    if (deps.mocha)                            stack.add('Mocha');
    if (deps['@playwright/test'])              stack.add('Playwright');
    if (deps['better-sqlite3'] || deps.sqlite3) stack.add('SQLite');
    if (deps.postgres || deps.pg)              stack.add('PostgreSQL');
    if (deps.mysql2)                           stack.add('MySQL');
    if (deps.mongodb || deps.mongoose)         stack.add('MongoDB');
    if (deps.prisma || deps['@prisma/client']) stack.add('Prisma');
    if (deps.zod)                              stack.add('Zod');
    if (deps.electron)                         stack.add('Electron');
    if (deps.tailwindcss)                      stack.add('Tailwind CSS');
    if (stack.size === 0 && pkg.name)          stack.add('Node.js');
  }

  if (requirements) {
    stack.add('Python');
    if (requirements.includes('django'))       stack.add('Django');
    if (requirements.includes('flask'))        stack.add('Flask');
    if (requirements.includes('fastapi'))      stack.add('FastAPI');
    if (requirements.includes('pytest'))       stack.add('pytest');
    if (requirements.includes('sqlalchemy'))   stack.add('SQLAlchemy');
  }

  return Array.from(stack).sort();
}

function detectPackageManager(folderPath, pkg) {
  if (!pkg) return null;
  if (existsSync(join(folderPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(folderPath, 'yarn.lock')))      return 'yarn';
  return 'npm';
}

function extractScripts(pkg) {
  if (!pkg?.scripts) return {};
  const relevant = ['test', 'lint', 'typecheck', 'type-check', 'check', 'build', 'dev'];
  return Object.fromEntries(
    Object.entries(pkg.scripts).filter(([k]) => relevant.some(r => k === r || k.startsWith(r + ':')))
  );
}

function detectHooks(folderPath) {
  const found = [];
  if (existsSync(join(folderPath, '.husky')))          found.push('.husky');
  if (existsSync(join(folderPath, '.lefthook.yml')))   found.push('.lefthook.yml');
  if (existsSync(join(folderPath, 'lefthook.yml')))    found.push('lefthook.yml');
  if (existsSync(join(folderPath, '.pre-commit-config.yaml'))) found.push('.pre-commit-config.yaml');
  return found;
}

function extractSpecPurpose(content) {
  const m = content.match(/##\s+Purpose\s+([\s\S]*?)(?=##|$)/i);
  if (m) return m[1].trim().split('\n')[0].slice(0, 300);
  for (const line of content.split('\n')) {
    if (line.trim() && !line.startsWith('#')) return line.trim().slice(0, 300);
  }
  return undefined;
}

function extractRules(content) {
  // Collect all bullet-point rules — no arbitrary cap
  const rules = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      rules.push(trimmed.replace(/^[-•]\s+/, ''));
    }
  }
  return rules;
}

function twoLevelTree(folderPath) {
  const SKIP = new Set([
    'node_modules', '.git', '.github', 'dist', 'build', '__pycache__',
    '.env', '.env.local', 'venv', '.venv', '.vscode', '.idea', 'coverage',
  ]);

  function walk(dir, depth = 0) {
    if (depth > 1) return '';
    const indent = '  '.repeat(depth);
    let result = '';
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') && depth > 0) continue;
        if (SKIP.has(entry.name)) continue;
        if (entry.isDirectory()) {
          result += `${indent}${entry.name}/\n`;
          result += walk(join(dir, entry.name), depth + 1);
        } else if (depth === 0) {
          result += `${indent}${entry.name}\n`;
        }
      }
    } catch { /* permission error — skip */ }
    return result;
  }

  return walk(folderPath).trim();
}

function buildPromptBlock({ projectPath, techStack, packageMgr, scripts, hooks, keyFiles, rules, specPurpose, tree }) {
  const parts = [`PROJECT CONTEXT\nPath: ${projectPath}`];

  if (techStack.length > 0) {
    const pm = packageMgr ? ` (${packageMgr})` : '';
    parts.push(`Tech stack: ${techStack.join(', ')}${pm}`);
  }

  if (Object.keys(scripts).length > 0) {
    const cmds = Object.entries(scripts).map(([k, v]) => `  ${k}: ${v}`).join('\n');
    parts.push(`package.json scripts:\n${cmds}`);
  }

  if (hooks.length > 0) {
    parts.push(`Pre-commit hooks detected: ${hooks.join(', ')}`);
  }

  const found = keyFiles.filter(f => f.found).map(f => f.filename);
  if (found.length) parts.push(`Companion files: ${found.join(', ')}`);

  if (specPurpose) parts.push(`SPEC purpose: ${specPurpose}`);

  if (rules.length > 0) {
    parts.push(`CLAUDE.md rules:\n${rules.map(r => `- ${r}`).join('\n')}`);
  }

  if (tree) parts.push(`Directory structure (2 levels):\n${tree}`);

  return parts.join('\n\n');
}
