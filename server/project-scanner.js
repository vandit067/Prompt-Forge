import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

export async function scanProject(folderPath) {
  // Validate path exists
  let stats;
  try {
    stats = statSync(folderPath);
    if (!stats.isDirectory()) {
      throw { code: 'NOT_DIRECTORY', message: 'Path is not a directory' };
    }
  } catch (err) {
    if (err.code === 'ENOENT') throw { code: 'NOT_FOUND', message: 'Folder not found' };
    throw err;
  }

  // Read companion files
  const spec = readSafe(join(folderPath, 'SPEC.md'));
  const claude = readSafe(join(folderPath, 'CLAUDE.md'));
  const prompts = readSafe(join(folderPath, 'PROMPTS.md'));
  const readme = readSafe(join(folderPath, 'README.md'));

  // Detect tech stack from package.json or requirements.txt
  const pkg = readJsonSafe(join(folderPath, 'package.json'));
  const requirements = readSafe(join(folderPath, 'requirements.txt'));
  const techStack = detectTechStack(pkg, requirements);

  // Extract text from SPEC.md and CLAUDE.md
  const specPurpose = spec ? extractSpecPurpose(spec) : undefined;
  const rules = claude ? extractRules(claude) : [];

  // Key files to track
  const keyFiles = [
    { filename: 'SPEC.md', found: !!spec },
    { filename: 'CLAUDE.md', found: !!claude },
    { filename: 'PROMPTS.md', found: !!prompts },
    { filename: 'README.md', found: !!readme },
    { filename: 'package.json', found: !!pkg },
    { filename: 'requirements.txt', found: !!requirements },
  ];

  const hasCompanionFiles = !!spec || !!claude;

  // Read folder structure (2 levels)
  const tree = twoLevelTree(folderPath);

  // Build the prompt block
  const promptBlock = buildPromptBlock({
    projectPath: folderPath,
    techStack,
    keyFiles,
    rules,
    specPurpose,
    hasCompanionFiles,
    tree,
  });

  return {
    projectPath: folderPath,
    techStack,
    keyFiles,
    rules,
    specPurpose,
    hasCompanionFiles,
    promptBlock,
  };
}

function readSafe(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function readJsonSafe(filePath) {
  const content = readSafe(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function detectTechStack(pkg, requirements) {
  const stack = new Set();

  // Node/JavaScript/TypeScript
  if (pkg) {
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (allDeps.typescript) stack.add('TypeScript');
    if (allDeps.react) stack.add('React');
    if (allDeps.vue) stack.add('Vue');
    if (allDeps.svelte) stack.add('Svelte');
    if (allDeps.express) stack.add('Express');
    if (allDeps.fastify) stack.add('Fastify');
    if (allDeps.nest || allDeps['@nestjs/core']) stack.add('NestJS');
    if (allDeps.vite) stack.add('Vite');
    if (allDeps.webpack) stack.add('Webpack');
    if (allDeps.jest) stack.add('Jest');
    if (allDeps['better-sqlite3'] || allDeps.sqlite3) stack.add('SQLite');
    if (allDeps.postgres || allDeps.pg) stack.add('PostgreSQL');
    if (allDeps.mongodb || allDeps.mongoose) stack.add('MongoDB');
    if (allDeps.zod) stack.add('Zod');

    if (stack.size === 0 && pkg.name) {
      stack.add('Node.js');
    }
  }

  // Python detection
  if (requirements) {
    stack.add('Python');
    if (requirements.includes('django')) stack.add('Django');
    if (requirements.includes('flask')) stack.add('Flask');
    if (requirements.includes('fastapi')) stack.add('FastAPI');
    if (requirements.includes('pytest')) stack.add('pytest');
    if (requirements.includes('numpy')) stack.add('NumPy');
    if (requirements.includes('pandas')) stack.add('Pandas');
    if (requirements.includes('scikit-learn')) stack.add('scikit-learn');
    if (requirements.includes('tensorflow') || requirements.includes('torch')) stack.add('ML/DL');
    if (requirements.includes('sqlalchemy')) stack.add('SQLAlchemy');
  }

  return Array.from(stack).sort();
}

function extractSpecPurpose(content) {
  // Look for ## Purpose section or first paragraph
  const purposeMatch = content.match(/##\s+Purpose\s+([\s\S]*?)(?=##|\Z)/i);
  if (purposeMatch) {
    return purposeMatch[1].trim().split('\n')[0].slice(0, 200);
  }

  // Fallback: first non-empty, non-heading line
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
      return line.trim().slice(0, 200);
    }
  }

  return undefined;
}

function extractRules(content) {
  const rules = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('- ') || line.startsWith('• ')) {
      rules.push(line.replace(/^[-•]\s+/, ''));
      if (rules.length >= 5) break; // Cap at 5 rules
    }
  }
  return rules;
}

function twoLevelTree(folderPath) {
  const SKIP = new Set(['node_modules', '.git', '.github', 'dist', 'build', '__pycache__', '.env', '.env.local', 'venv', '.vscode', '.idea']);

  function walk(dir, depth = 0) {
    if (depth > 2) return '';

    const indent = '  '.repeat(depth);
    let result = '';

    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') && !entry.isDirectory()) continue;
        if (SKIP.has(entry.name)) continue;

        if (entry.isDirectory()) {
          result += `${indent}${entry.name}/\n`;
          if (depth < 1) {
            result += walk(join(dir, entry.name), depth + 1);
          }
        } else if (depth === 0) {
          // Only show files at root level
          result += `${indent}${entry.name}\n`;
        }
      }
    } catch {
      // Skip on permission errors
    }

    return result;
  }

  return walk(folderPath).trim();
}

function buildPromptBlock(context) {
  let block = `PROJECT CONTEXT:
Path: ${context.projectPath}`;

  if (context.techStack.length > 0) {
    block += `\nTech stack: ${context.techStack.join(', ')}`;
  }

  block += '\n\nKey files found:';
  for (const file of context.keyFiles) {
    const icon = file.found ? '✓' : '—';
    block += `\n- ${file.filename} ${icon}`;
    if (file.found && file.excerpt) {
      block += ` — ${file.excerpt}`;
    }
  }

  if (context.rules.length > 0) {
    block += '\n\nCLAUDE.md Rules:';
    for (const rule of context.rules.slice(0, 3)) {
      block += `\n- ${rule}`;
    }
  }

  if (context.tree) {
    block += '\n\nDirectory structure (2 levels):';
    block += '\n' + context.tree;
  }

  return block;
}
