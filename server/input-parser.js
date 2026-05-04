/**
 * Detects input type (plain text, stack trace, GitHub/Linear/Jira issue)
 * and returns an enriched prompt context for better generation.
 */

// ── Pattern constants ──────────────────────────────────────────────────────────

const GITHUB_ISSUE_RE = /https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/issues\/(\d+)/;
const LINEAR_ISSUE_RE = /https?:\/\/linear\.app\/[^/\s]+\/issue\/([A-Z]+-\d+)/;
const JIRA_TICKET_RE  = /\b([A-Z]{2,10}-\d+)\b/;

// JavaScript/TypeScript error
const JS_ERROR_RE = /^([\w.]+Error(?:Type)?):\s*(.+)/m;
const JS_FRAME_RE = /at\s+([\w.<>\[\] /]+)\s+\((.+?):(\d+):(\d+)\)/g;
const JS_ANON_RE  = /at\s+(.+?):(\d+):(\d+)/g;

// Python traceback
const PY_TRACEBACK_RE  = /Traceback \(most recent call last\):/;
const PY_ERROR_RE      = /^(\w+(?:Error|Exception|Warning)):\s*(.+)/m;
const PY_FRAME_RE      = /File "(.+?)", line (\d+), in (.+)/g;

// JVM (Java / Kotlin / Scala)
const JVM_EXCEPTION_RE = /^([\w.]+(?:Exception|Error|Throwable))(?::\s*(.+))?/m;
const JVM_FRAME_RE     = /at\s+([\w.$]+)\.([\w$<>]+)\(([\w.]+):(\d+)\)/g;

// Rust panic
const RUST_PANIC_RE    = /thread '.+' panicked at '(.+)'/;

// ── Type detector ─────────────────────────────────────────────────────────────

function detectType(input) {
  if (JS_FRAME_RE.test(input) || JS_ERROR_RE.test(input)) {
    JS_FRAME_RE.lastIndex = 0; // reset stateful regex
    return 'js-stacktrace';
  }
  if (PY_TRACEBACK_RE.test(input)) return 'py-traceback';
  if (JVM_EXCEPTION_RE.test(input) && JVM_FRAME_RE.test(input)) {
    JVM_FRAME_RE.lastIndex = 0;
    return 'jvm-stacktrace';
  }
  if (RUST_PANIC_RE.test(input)) return 'rust-panic';
  if (GITHUB_ISSUE_RE.test(input)) return 'github-issue';
  if (LINEAR_ISSUE_RE.test(input)) return 'linear-issue';
  if (JIRA_TICKET_RE.test(input)) return 'jira-ticket';
  return 'plain';
}

// ── Extractors ────────────────────────────────────────────────────────────────

function extractJSError(input) {
  const errorMatch = JS_ERROR_RE.exec(input);
  const frames = [];
  const re = new RegExp(JS_FRAME_RE.source, 'g');
  let m;
  while ((m = re.exec(input)) !== null && frames.length < 6) {
    frames.push({ fn: m[1].trim(), file: m[2], line: parseInt(m[3]) });
  }
  if (!frames.length) {
    // Anonymous frames
    const anonRe = new RegExp(JS_ANON_RE.source, 'g');
    while ((m = anonRe.exec(input)) !== null && frames.length < 3) {
      frames.push({ fn: '<anonymous>', file: m[1], line: parseInt(m[2]) });
    }
  }
  return {
    errorType:    errorMatch ? errorMatch[1] : 'Error',
    errorMessage: errorMatch ? errorMatch[2].trim() : '',
    frames,
  };
}

function extractPyError(input) {
  const errorMatch = PY_ERROR_RE.exec(input);
  const frames = [];
  const re = new RegExp(PY_FRAME_RE.source, 'g');
  let m;
  while ((m = re.exec(input)) !== null && frames.length < 6) {
    frames.push({ file: m[1], line: parseInt(m[2]), fn: m[3].trim() });
  }
  return {
    errorType:    errorMatch ? errorMatch[1] : 'Exception',
    errorMessage: errorMatch ? errorMatch[2].trim() : '',
    frames,
  };
}

function extractJVMError(input) {
  const errorMatch = JVM_EXCEPTION_RE.exec(input);
  const frames = [];
  const re = new RegExp(JVM_FRAME_RE.source, 'g');
  let m;
  while ((m = re.exec(input)) !== null && frames.length < 6) {
    frames.push({ class: m[1], method: m[2], file: m[3], line: parseInt(m[4]) });
  }
  return {
    errorType:    errorMatch ? errorMatch[1].split('.').pop() : 'Exception',
    errorMessage: errorMatch?.[2]?.trim() || '',
    frames,
  };
}

// ── Prefix builders ───────────────────────────────────────────────────────────

function frameLines(frames) {
  return frames.slice(0, 4).map(f => {
    if (f.class) return `  at ${f.class}.${f.method}(${f.file}:${f.line})`;
    if (f.fn)    return `  at ${f.fn} (${f.file}:${f.line})`;
    return `  File "${f.file}", line ${f.line}, in ${f.fn}`;
  }).join('\n');
}

function buildStackPrefix(lang, { errorType, errorMessage, frames }) {
  return [
    `Bug report (${lang}):`,
    `Error type: ${errorType}`,
    errorMessage ? `Message: ${errorMessage}` : null,
    frames.length ? `Top frames:\n${frameLines(frames)}` : null,
    '',
    'Full stack trace below — please fix this bug:',
  ].filter(v => v !== null).join('\n');
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Parse an arbitrary user input and return:
 *   type        — detected input type
 *   enriched    — input string with a structured prefix prepended (same as input for 'plain')
 *   metadata    — extracted error info or issue reference
 *   isStackTrace — true for any *-stacktrace / *-traceback / *-panic types
 *   isIssue     — true for github-issue / linear-issue / jira-ticket types
 *   suggestedTaskType — override hint for task classification ('BUG_FIX' etc.) or null
 */
export function parseInput(input) {
  const trimmed = input.trim();
  const type = detectType(trimmed);

  if (type === 'plain') {
    return { type, enriched: trimmed, metadata: {}, isStackTrace: false, isIssue: false, suggestedTaskType: null };
  }

  let prefix = '';
  let metadata = {};

  switch (type) {
    case 'js-stacktrace': {
      const extracted = extractJSError(trimmed);
      metadata = extracted;
      prefix = buildStackPrefix('JavaScript/TypeScript', extracted);
      break;
    }
    case 'py-traceback': {
      const extracted = extractPyError(trimmed);
      metadata = extracted;
      prefix = buildStackPrefix('Python', extracted);
      break;
    }
    case 'jvm-stacktrace': {
      const extracted = extractJVMError(trimmed);
      metadata = extracted;
      prefix = buildStackPrefix('JVM (Java/Kotlin)', extracted);
      break;
    }
    case 'rust-panic': {
      const m = RUST_PANIC_RE.exec(trimmed);
      metadata = { errorType: 'panic', errorMessage: m ? m[1] : '' };
      prefix = [
        'Bug report (Rust):',
        `Panic message: ${metadata.errorMessage}`,
        '',
        'Full panic output below — please fix this bug:',
      ].join('\n');
      break;
    }
    case 'github-issue': {
      const m = GITHUB_ISSUE_RE.exec(trimmed);
      const ref = m ? `${m[1]}/${m[2]}#${m[3]}` : 'unknown';
      metadata = { issueRef: ref, owner: m?.[1], repo: m?.[2], number: m?.[3] };
      prefix = [
        `GitHub Issue: ${ref}`,
        'Task: Investigate and fix (or implement) the issue described below.',
        '',
      ].join('\n');
      break;
    }
    case 'linear-issue': {
      const m = LINEAR_ISSUE_RE.exec(trimmed);
      const id = m ? m[1] : 'unknown';
      metadata = { issueRef: id };
      prefix = [
        `Linear Issue: ${id}`,
        'Task: Implement the fix or feature described in this ticket.',
        '',
      ].join('\n');
      break;
    }
    case 'jira-ticket': {
      const m = JIRA_TICKET_RE.exec(trimmed);
      const id = m ? m[1] : 'unknown';
      metadata = { issueRef: id };
      prefix = [
        `Jira Ticket: ${id}`,
        'Task: Implement the story or fix described in this ticket.',
        '',
      ].join('\n');
      break;
    }
  }

  const isStackTrace = ['js-stacktrace', 'py-traceback', 'jvm-stacktrace', 'rust-panic'].includes(type);
  const isIssue      = ['github-issue', 'linear-issue', 'jira-ticket'].includes(type);

  return {
    type,
    enriched:            prefix ? `${prefix}\n${trimmed}` : trimmed,
    metadata,
    isStackTrace,
    isIssue,
    suggestedTaskType:   isStackTrace ? 'BUG_FIX' : isIssue ? 'BUG_FIX' : null,
  };
}
