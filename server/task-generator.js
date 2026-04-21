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
  const platformContext = platforms.length > 0 ? `Target platforms: ${platforms.join(', ')}` : 'Target platform: Not specified (infer from context)';

  const featureList = features.length > 0
    ? `\nKey features to implement:\n${features.map(f => `- ${f}`).join('\n')}`
    : '\nKey features: Infer from request context and implement core functionality';

  const sessionCount = input.length > 100 ? 2 : 1;
  const needsArchitecture = platforms.length > 1 || input.toLowerCase().includes('architecture');

  const architectureSection = needsArchitecture ? `

Architecture Guidance:
- If multiple platforms: design shared business logic layer separate from UI
- Consider a modular approach: core engine → platform-specific wrappers
- Use dependency injection for testability
- Separate concerns: models, services, UI components` : '';

  const basePrompt = `Context: User request: "${input}"
${platformContext}${featureList}

Requirements:
1. Implement all features mentioned in the request
2. Follow best practices for code organization and maintainability
3. Handle edge cases and errors gracefully with user-friendly messages
4. If multiple platforms: ensure consistent behavior across all platforms
${needsArchitecture ? '5. Design architecture to minimize code duplication' : ''}

Design Considerations:${architectureSection}

Implementation Steps:
1. Analyze requirements and identify all features needed
2. Plan code structure and module organization
3. Implement core functionality with clean, readable code
4. Add comprehensive error handling and validation
5. Implement UI/UX following platform conventions
6. Add proper logging and debugging capabilities
7. Write tests for critical functionality
8. Optimize performance and resource usage

Code Quality Requirements:
- Clean, readable variable and function names
- DRY principle: avoid code duplication
- Proper error handling at all levels
- No hardcoded values that should be configurable
- Comments only for non-obvious logic
- Follow language/platform style conventions

Testing & Validation:
- Manual testing of happy path and edge cases
- Test with invalid/unexpected input
- Verify error messages are helpful
- Check performance with realistic data
- Ensure app doesn't crash under stress

Verification Checklist:
- All features from requirements work correctly
- No unhandled errors or crashes
- Code is readable and maintainable
- Performance is acceptable
- UI feels native and responsive`;

  const prompts = [
    {
      id: 'prompt-1',
      sessionLabel: sessionCount > 1 ? 'Session 1 — Architecture & Core' : 'Session 1 — Implementation',
      content: basePrompt + `

${sessionCount === 1 ? `

Validation Audit:
Before we finish, do a full audit. Do NOT change any code yet. Just report:

1. **Requirements Met**: Does implementation include all features mentioned?
2. **Code Quality**: Check for errors, unused code, hardcoded values, missing error handling
3. **Completeness**: Are all features fully implemented and tested?
4. **Edge Cases**: What breaks if user provides invalid input or unexpected data?
5. **User Experience**: Are errors clear and helpful? Does the app feel polished?
6. ${platforms.length > 0 ? `**Platform Specifics**: Does it work correctly on ${platforms.join(' and ')}?` : '**Architecture**: Is code well-organized and maintainable?'}

Show me the complete audit report. Do not make changes yet.

After audit: "Fix all gaps found in the audit, smallest first. Commit after each fix."` : `

This session focuses on architecture and core implementation. Session 2 will handle UI/testing.`}`,
    },
  ];

  if (sessionCount > 1) {
    prompts.push({
      id: 'prompt-2',
      sessionLabel: 'Session 2 — UI, Testing & Polish (Final)',
      content: `Context: Continue from Session 1 - core implementation complete

Remaining Work:
1. Build complete user interface following platform conventions
2. Integrate core functionality into UI
3. Add comprehensive testing (unit and integration)
4. Optimize performance
5. Final polish and edge case handling

UI/UX Requirements:
- Intuitive navigation and clear information hierarchy
- Responsive to different screen sizes (if applicable)
- Accessible controls and readable text
- Proper loading states and error messages
- Smooth animations and transitions
- Platform-native look and feel

Testing Requirements:
- Test all user flows and feature interactions
- Test with edge case and invalid inputs
- Verify error handling with graceful recovery
- Performance testing with realistic data
- Cross-platform compatibility (if applicable)

Final Validation:
Before we finish, do a full audit. Report (do NOT fix yet):

1. **Requirements**: Are all features fully implemented and working?
2. **Code Quality**: No errors, unused code, hardcoded values, or missing error handling
3. **Testing**: All features tested, edge cases covered, error handling works
4. **UI/UX**: Responsive, accessible, native feel, clear feedback to users
5. **Performance**: App is fast and doesn't lag or crash
6. **Polish**: Code is well-organized, documented where needed, ready for production

Show the complete audit report. Do not make changes yet.

After audit: "Fix all gaps found in the audit, smallest first. Commit after each fix."`,
    });
  }

  return prompts;
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
