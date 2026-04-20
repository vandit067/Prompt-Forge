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
  // Detect technology/domain from input
  const isAndroid = /android|kotlin|java(?:\s+app)?/.test(input.toLowerCase());
  const isIOS = /ios|swift|objective-c/.test(input.toLowerCase());
  const isWeb = /web|react|vue|angular|javascript|typescript/.test(input.toLowerCase());
  const isPython = /python|django|flask/.test(input.toLowerCase());
  const isTheme = /theme|dark|light|color|style/.test(input.toLowerCase());
  const isAPI = /api|backend|server|database/.test(input.toLowerCase());

  let techContext = '';
  if (isAndroid) techContext = 'Android (Kotlin/Java)';
  else if (isIOS) techContext = 'iOS (Swift)';
  else if (isWeb) techContext = 'Web (JavaScript/TypeScript)';
  else if (isPython) techContext = 'Python';

  const specifics = [];
  if (isTheme) specifics.push('- Theme/styling implementation with clear abstractions');
  if (isAPI) specifics.push('- API integration with proper error handling');
  if (/ui|layout|component|screen/.test(input.toLowerCase())) specifics.push('- UI/UX best practices and responsive design');

  const specificRequirements = specifics.length > 0 ? `\n\nSpecific focus areas:\n${specifics.join('\n')}` : '';

  const basePrompt = `Context: Build an ${techContext ? `${techContext} ` : ''}application with the following requirements:\n"${input}"${specificRequirements}

Requirements Analysis:
${extractRequirements(input)}

Steps:
1. Break down the requirements into well-defined features
2. Design the architecture and data structures
3. Implement core functionality with clean, modular code
4. Add comprehensive error handling and validation
5. Test thoroughly including edge cases and user flows
6. Ensure performance and maintainability

Constraints:
- Follow platform-specific best practices and conventions
- Use established patterns and libraries where appropriate
- Write code that's testable and maintainable
- Include meaningful comments only for complex logic
- Keep configuration separate from hardcoded values

Verification:
- All requirements from the context are implemented
- App runs without crashes or warnings
- User interactions work smoothly without lag
- Error cases are handled gracefully
- Code follows style guidelines for the platform`;

  return [
    {
      sessionLabel: 'Session 1 — Implementation',
      content: basePrompt + `

Validation Audit:
Before finishing, do a full audit. Report (do NOT fix yet):

1. **Requirements Met**: Does the implementation address all requirements above?
2. **Functionality**: Test each feature mentioned - does it work as expected?
3. **Code Quality**: Check for errors, unused code, hardcoded values, missing error handling
4. **Edge Cases**: What breaks if user provides invalid input or uses features in unexpected order?
5. **User Experience**: Are errors clear? Is the UI responsive?

Show the complete audit report. Do not make changes yet.

After audit: "Fix all issues found in the audit, smallest first. Commit after each fix."`,
    },
  ];
}

function extractRequirements(input) {
  // Extract key requirements from user input
  const requirements = [];

  // Feature detection
  const features = {
    'theme/color management': /theme|color|style|dark|light/i,
    'settings screen': /setting|preference|configuration|config/i,
    'user interface': /ui|layout|screen|view|button|button/i,
    'data persistence': /save|store|persist|database|cache/i,
    'authentication': /login|auth|user|account|password/i,
    'notifications': /notification|alert|notify|message/i,
    'api/backend': /api|backend|server|network|sync/i,
  };

  for (const [feature, regex] of Object.entries(features)) {
    if (regex.test(input)) {
      requirements.push(`- ${feature.charAt(0).toUpperCase() + feature.slice(1)}`);
    }
  }

  if (requirements.length === 0) {
    requirements.push('- Core application functionality');
  }

  return requirements.join('\n');
}

function generateFiles(taskType, input = '') {
  if (taskType === 'NEW_TOOL') {
    return [
      {
        filename: 'SPEC.md',
        content: `# Project Specification

## Purpose
Description of what this tool/project does.

## Features
- Feature 1
- Feature 2
- Feature 3

## Architecture
High-level design and technology choices.

## Setup
Installation and configuration steps.
`,
      },
      {
        filename: 'CLAUDE.md',
        content: `# CLAUDE.md

Guidelines for working on this project.

## Key Files
- Main entry point
- Configuration
- Tests

## Before You Start
Read SPEC.md for full context.

## Rules
- Keep code modular and testable
- Use meaningful variable names
- Add comments for complex logic
`,
      },
    ];
  }

  if (taskType === 'DOC_OR_SPEC') {
    return [
      {
        filename: 'DOCUMENTATION.md',
        content: `# Documentation

## Overview
Describe what this documents.

## Getting Started
Step-by-step guide for new users.

## Advanced Usage
More complex scenarios and configurations.

## Troubleshooting
Common issues and solutions.
`,
      },
    ];
  }

  // Generate starter files for features mentioned in input
  const files = [];
  const lower = input.toLowerCase();

  if (/android|kotlin|java/.test(lower)) {
    if (/theme|color|style/.test(lower)) {
      files.push({
        filename: 'ThemeConfig.kt',
        content: `// Theme configuration for the app
object ThemeConfig {
    enum class Theme {
        LIGHT_BLUE,
        LIGHT_GREEN,
        LIGHT_PURPLE,
        DARK_BLUE,
        DARK_GREEN,
        DARK_PURPLE
    }

    fun applyTheme(context: Context, theme: Theme) {
        // Apply theme to app
    }

    fun getRandomTheme(): Theme {
        return Theme.values().random()
    }
}
`,
      });

      files.push({
        filename: 'SettingsFragment.kt',
        content: `// Settings screen with theme selector
class SettingsFragment : Fragment() {
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val themeButton = view.findViewById<Button>(R.id.random_theme_button)
        themeButton.setOnClickListener {
            val newTheme = ThemeConfig.getRandomTheme()
            ThemeConfig.applyTheme(requireContext(), newTheme)
            // Save preference
        }
    }
}
`,
      });
    }
  }

  if (/ios|swift/.test(lower)) {
    if (/theme|color|style/.test(lower)) {
      files.push({
        filename: 'ThemeManager.swift',
        content: `// Theme management for iOS app
class ThemeManager {
    enum Theme: CaseIterable {
        case lightBlue
        case lightGreen
        case lightPurple
        case darkBlue
        case darkGreen
        case darkPurple
    }

    static func applyTheme(_ theme: Theme) {
        // Apply theme colors to app
    }

    static func randomTheme() -> Theme {
        return Theme.allCases.randomElement() ?? .lightBlue
    }
}
`,
      });
    }
  }

  if (/web|react|vue|angular/.test(lower)) {
    if (/theme|color|style|dark|light/.test(lower)) {
      files.push({
        filename: 'theme.config.js',
        content: `// Theme configuration
export const themes = {
  LIGHT_BLUE: { name: 'Light Blue', primary: '#3b82f6', isDark: false },
  LIGHT_GREEN: { name: 'Light Green', primary: '#10b981', isDark: false },
  LIGHT_PURPLE: { name: 'Light Purple', primary: '#a855f7', isDark: false },
  DARK_BLUE: { name: 'Dark Blue', primary: '#1e3a8a', isDark: true },
  DARK_GREEN: { name: 'Dark Green', primary: '#064e3b', isDark: true },
  DARK_PURPLE: { name: 'Dark Purple', primary: '#581c87', isDark: true },
};

export function getRandomTheme() {
  const themeKeys = Object.keys(themes);
  return themes[themeKeys[Math.floor(Math.random() * themeKeys.length)]];
}
`,
      });

      files.push({
        filename: 'Settings.jsx',
        content: `// Settings component with theme selector
export function Settings() {
  const [currentTheme, setCurrentTheme] = useState(themes.LIGHT_BLUE);

  const handleRandomTheme = () => {
    const newTheme = getRandomTheme();
    setCurrentTheme(newTheme);
    applyThemeToDOM(newTheme);
    localStorage.setItem('theme', JSON.stringify(newTheme));
  };

  return (
    <div className="settings">
      <h2>Settings</h2>
      <button onClick={handleRandomTheme}>
        Random Theme
      </button>
      <p>Current: {currentTheme.name}</p>
    </div>
  );
}
`,
      });
    }
  }

  return files;
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
