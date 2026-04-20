import crypto from 'crypto';

// Simple task type classification based on keywords
function classifyTaskType(input) {
  const lower = input.toLowerCase();

  if (/\b(build|create|new|make|develop|implement|add)\b/.test(lower)) return 'NEW_TOOL';
  if (/\b(bug|broken|crash|error|fix|issue|not working)\b/.test(lower)) return 'BUG_FIX';
  if (/\b(review|check|audit|examine|analyze)\b/.test(lower)) return 'CODE_REVIEW';
  if (/\b(refactor|restructure|rewrite|clean|reorganize)\b/.test(lower)) return 'REFACTOR';
  if (/\b(optimize|fast|speed|performance|slow|improve|efficient)\b/.test(lower)) return 'PERF_OPTIMIZATION';
  if (/\b(doc|document|readme|guide|comment|explain)\b/.test(lower)) return 'DOC_OR_SPEC';
  if (/\b(debug|investigate|trace|diagnose)\b/.test(lower)) return 'DEBUG_INVESTIGATION';

  return 'NEW_FEATURE';
}

// Generate a simple title from input
function generateTitle(input) {
  // Take first sentence or 55 chars, whichever is shorter
  const match = input.match(/^([^.!?]*[.!?]?)/);
  let title = (match ? match[1] : input).trim();
  if (title.length > 55) {
    title = title.substring(0, 55).trim();
  }
  return title;
}

// Generate task specifications using templates
function generateTaskSpec(input, taskType) {
  const title = generateTitle(input);
  const id = crypto.randomUUID().slice(0, 8);

  // Template-based prompt generation
  const prompts = generatePrompts(input, taskType);
  const files = generateFiles(taskType, input);
  const plan = generatePlan(prompts.length);
  const checklist = generateChecklist(taskType);

  return {
    title,
    taskType,
    generatedPrompts: prompts,
    generatedFiles: files,
    generatedPlan: plan,
    generatedChecklist: checklist,
  };
}

function generatePrompts(input, taskType) {
  const basePrompt = `Context: User request: "${input}"

Steps:
1. Understand the requirements and acceptance criteria
2. Plan the implementation approach and technical decisions
3. Write clear, modular code following best practices
4. Test thoroughly with various inputs and edge cases
5. Ensure error handling and user feedback are appropriate

Constraints:
- Write clean, maintainable code
- Follow language-specific conventions and idioms
- Add comments only for non-obvious logic
- No hardcoded values that should be configurable

Verification:
- Type checking passes (if applicable)
- All tests pass
- Manual testing confirms expected behavior
- No console errors or warnings`;

  return [
    {
      id: 'prompt-1',
      sessionLabel: 'Session 1 — Implementation',
      content: basePrompt + `

Validation Audit:
Before we finish, do a full audit. Do NOT change any code yet. Just report:

1. **Spec compliance**: Compare what was built against the requirements in this prompt
2. **Code quality**: Check for any errors, unused imports, console.logs left in
3. **Edge cases**: Identify 3 things that could break with unexpected input
4. **Testing**: Verify all manual tests passed
5. **User experience**: Check that feedback and error messages are clear

Show me the full report. Do not fix anything yet.

After the audit report, add: Fix all gaps found in the audit, smallest first. Commit after each fix.`,
    },
  ];
}

function generateFiles(taskType, input = '') {
  if (taskType === 'NEW_TOOL') {
    return [
      {
        id: 'file-spec',
        filename: 'SPEC.md',
        content: `# Project Specification\n\n## Purpose\nDescription of what this tool/project does.\n\n## Features\n- Feature 1\n- Feature 2\n\n## Architecture\nHigh-level design.\n`,
      },
      {
        id: 'file-claude',
        filename: 'CLAUDE.md',
        content: `# CLAUDE.md\n\nGuidelines for this project.\n\n## Rules\n- Keep code modular\n- Use meaningful names\n`,
      },
    ];
  }

  if (taskType === 'DOC_OR_SPEC') {
    return [
      {
        id: 'file-docs',
        filename: 'DOCUMENTATION.md',
        content: `# Documentation\n\n## Overview\nMain documentation.\n\n## Getting Started\nStep-by-step guide.\n`,
      },
    ];
  }

  return [];
}

function generatePlan(numSessions) {
  const plans = [];
  for (let i = 1; i <= numSessions; i++) {
    plans.push({
      session: i,
      title: `Implementation & Testing`,
      description: `Implement features, test thoroughly, and audit for quality`,
      estimatedTime: '45 min',
    });
  }
  return plans;
}

function generateChecklist(taskType) {
  const baseItems = [
    'Code compiles/runs without errors',
    'Manual testing passes on happy path',
    'Edge cases handled appropriately',
    'No console errors or warnings',
    'Code is readable and maintainable',
  ];

  const typeSpecific = {
    NEW_TOOL: [
      'CLI is functional with basic commands',
      'Help/usage information is clear',
    ],
    BUG_FIX: [
      'Original bug no longer reproduces',
      'No regression in related features',
    ],
    CODE_REVIEW: [
      'Security issues identified',
      'Performance concerns noted',
    ],
    REFACTOR: [
      'Functionality unchanged after refactor',
      'Code is more maintainable',
    ],
  };

  return [...baseItems, ...(typeSpecific[taskType] || [])];
}

export function generateLocalTask(input, projectPath, projectContext) {
  const taskType = classifyTaskType(input);
  const spec = generateTaskSpec(input, taskType);

  return {
    id: Math.random().toString(36).slice(2, 10),
    title: spec.title,
    input,
    taskType: spec.taskType,
    projectPath: projectPath || undefined,
    projectContext: projectContext || undefined,
    status: 'pending',
    generatedPrompts: spec.generatedPrompts,
    generatedFiles: spec.generatedFiles,
    generatedPlan: spec.generatedPlan,
    generatedChecklist: spec.generatedChecklist,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
