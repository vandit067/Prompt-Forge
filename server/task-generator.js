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
  // Extract platforms and features from input
  const platforms = extractPlatforms(input);
  const features = extractFeatures(input);
  const platformContext = platforms.length > 0 ? `Target platforms: ${platforms.join(', ')}` : '';

  const featureList = features.length > 0
    ? `\nKey features to implement:\n${features.map(f => `- ${f}`).join('\n')}`
    : '';

  const basePrompt = `Context: User request: "${input}"
${platformContext}${featureList}

Requirements:
1. Implement all features mentioned above
2. Ensure cross-platform compatibility (if applicable)
3. Handle errors gracefully with user-friendly messages
4. Follow platform-specific conventions and UX patterns

Steps:
1. Break down requirements into well-defined features
2. Plan architecture for cross-platform code sharing
3. Implement core functionality with clean, modular code
4. Add comprehensive error handling and validation
5. Test on all target platforms
6. Verify performance and user experience

Constraints:
- Use platform-specific best practices
- Keep common code DRY and reusable
- No hardcoded configuration values
- Include only necessary comments

Verification:
- All features from requirements are working
- No crashes or unhandled errors
- App runs smoothly on all target platforms
- Code follows language/platform conventions`;

  return [
    {
      id: 'prompt-1',
      sessionLabel: 'Session 1 — Implementation',
      content: basePrompt + `

Validation Audit:
Before we finish, do a full audit. Do NOT change any code yet. Just report:

1. **Requirements Met**: Does the implementation include all features mentioned above?
2. **Cross-Platform**: Does it work correctly on ${platforms.join(' and ')}?
3. **Code Quality**: Check for errors, unused code, hardcoded values, missing error handling
4. **Edge Cases**: What breaks if user provides invalid input or uses features unexpectedly?
5. **User Experience**: Are errors clear? Does the UI feel native to each platform?

Show me the complete audit report. Do not make changes yet.

After audit: "Fix all gaps found in the audit, smallest first. Commit after each fix."`,
    },
  ];
}

function extractPlatforms(input) {
  const platforms = [];
  if (/android|kotlin|java(?:\s+app)?/i.test(input)) platforms.push('Android');
  if (/ios|swift|iphone/i.test(input)) platforms.push('iOS');
  if (/web|react|vue|angular|javascript|typescript/i.test(input)) platforms.push('Web');
  if (/desktop|electron|tauri|windows|macos|linux/i.test(input)) platforms.push('Desktop');
  if (/python|django|flask/i.test(input)) platforms.push('Python');
  return platforms;
}

function extractFeatures(input) {
  const features = [];
  const featurePatterns = {
    'Music playback': /music|play|audio|sound|track|song/i,
    'Playlist management': /playlist|queue|library|collection/i,
    'Search functionality': /search|find|query|filter/i,
    'User authentication': /login|auth|user|account|sign/i,
    'File management': /file|import|export|upload|download/i,
    'Theme/Styling': /theme|dark|light|color|style/i,
    'Settings': /setting|preference|option|configuration/i,
    'Notifications': /notification|alert|notify|message/i,
    'Analytics/Tracking': /analytic|track|stat|metric/i,
  };

  for (const [feature, regex] of Object.entries(featurePatterns)) {
    if (regex.test(input)) {
      features.push(feature);
    }
  }

  return features.length > 0 ? features : ['Core application functionality'];
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
