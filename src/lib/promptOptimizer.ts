export interface Suggestion {
  id: string;
  type: 'missing_section' | 'weak_constraint' | 'missing_example' | 'incomplete_verification' | 'structural';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  example?: string;
  applied?: boolean;
}

export interface OptimizationResult {
  suggestions: Suggestion[];
  improvementScore: number; // 0-100, how much improvement is possible
  summary: string;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function analyzePrompt(content: string): OptimizationResult {
  const suggestions: Suggestion[] = [];
  const lines = content.split('\n');
  const sections = {
    role: /^Role:/m.test(content),
    context: /^Context:/m.test(content),
    goal: /^Goal:/m.test(content),
    steps: /^Steps/m.test(content),
    constraints: /^Key Constraints/m.test(content),
    output: /^Expected Output/m.test(content),
    verification: /^Verification/m.test(content),
  };

  // Check for missing sections
  if (!sections.role) {
    suggestions.push({
      id: uid(),
      type: 'missing_section',
      severity: 'high',
      title: 'Missing Role Section',
      description: 'Prompts should start with a Role that sets the AI\'s perspective and expertise.',
      recommendation: 'Add a Role section at the top: "Role: [title/expertise]"',
      example: 'Role: Full-stack engineer building greenfield products',
    });
  }

  if (!sections.goal) {
    suggestions.push({
      id: uid(),
      type: 'missing_section',
      severity: 'high',
      title: 'Missing Goal Section',
      description: 'A clear Goal tells the AI what success looks like for this session.',
      recommendation: 'Add: "Goal: [what to accomplish and success criteria]"',
      example: 'Goal: Implement feature with all states handled and tests passing',
    });
  }

  if (!sections.output) {
    suggestions.push({
      id: uid(),
      type: 'missing_section',
      severity: 'high',
      title: 'Missing Expected Output Section',
      description: 'Explicit output guidance reduces ambiguity about what to produce.',
      recommendation: 'Add: "Expected Output:" with a bulleted list of deliverables',
      example: '- Working feature in happy path\n- All error states handled\n- Unit tests added',
    });
  }

  if (!sections.verification) {
    suggestions.push({
      id: uid(),
      type: 'missing_section',
      severity: 'medium',
      title: 'Missing Verification Checklist',
      description: 'A checklist makes it clear when work is truly done.',
      recommendation: 'Add: "Verification Checklist:" with □ checkboxes for each criterion',
      example: '□ Feature works with valid input\n□ Tests pass\n□ No TypeScript errors',
    });
  }

  // Check for weak constraints
  const constraintSection = content.match(/^Key Constraints.*?(?=\n---|\n\n[A-Z]|$)/ms);
  if (constraintSection) {
    const constraintText = constraintSection[0];

    if (!constraintText.includes('[CRITICAL]')) {
      suggestions.push({
        id: uid(),
        type: 'weak_constraint',
        severity: 'medium',
        title: 'No [CRITICAL] Priority Markers',
        description: 'Marking constraints with [CRITICAL] shows which are non-negotiable.',
        recommendation: 'Add [CRITICAL] markers to the most important constraints',
        example: '- [CRITICAL] Diagnose before mutate\n- [CRITICAL] All tests pass',
      });
    }

    // Check if constraints are specific enough
    const hasVague = /constraint|rule|ensure|make sure|don't forget/i.test(constraintText);
    if (hasVague) {
      suggestions.push({
        id: uid(),
        type: 'weak_constraint',
        severity: 'low',
        title: 'Vague Constraint Wording',
        description: 'Some constraints are too vague. Be specific about what\'s required.',
        recommendation: 'Replace vague terms with concrete requirements',
        example: 'Instead of "ensure quality", write "test coverage ≥ 80%"',
      });
    }
  }

  // Check for examples in Output section
  if (sections.output) {
    const outputSection = content.match(/^Expected Output.*?(?=\n---|\n\n[A-Z]|$)/ms);
    if (outputSection && !outputSection[0].includes('example') && !outputSection[0].includes('e.g.')) {
      suggestions.push({
        id: uid(),
        type: 'missing_example',
        severity: 'low',
        title: 'No Examples in Expected Output',
        description: 'Concrete examples of output formats help the AI understand expectations.',
        recommendation: 'Add example values or formats for key outputs',
        example: 'e.g., file structure:\nsrc/\n  components/\n  hooks/\n  types/',
      });
    }
  }

  // Check for concrete verification criteria
  if (sections.verification) {
    const verificationSection = content.match(/^Verification.*?$/ms);
    if (verificationSection) {
      const verifyText = verificationSection[0];

      // Look for measurable criteria
      const hasMeasurable = /\d+|zero|all|none|complete|pass|fail|error|success/i.test(verifyText);

      if (!hasMeasurable) {
        suggestions.push({
          id: uid(),
          type: 'incomplete_verification',
          severity: 'medium',
          title: 'Verification Criteria Could Be More Concrete',
          description: 'Verification is more useful with measurable, objective criteria.',
          recommendation: 'Use specific metrics: ≥ 80% coverage, zero errors, all tests pass',
          example: '□ npm test → all tests pass\n□ npx tsc --noEmit → zero errors',
        });
      }
    }
  }

  // Check overall structure
  if (!content.includes('---')) {
    suggestions.push({
      id: uid(),
      type: 'structural',
      severity: 'low',
      title: 'Add Section Dividers',
      description: 'Using "---" dividers makes sections visually distinct and easier to scan.',
      recommendation: 'Add "---" lines between major sections',
      example: 'Goal: ...\n\n---\n\nSteps:',
    });
  }

  // Calculate improvement score
  const maxPossiblePoints = 7; // Role, Context, Goal, Steps, Constraints, Output, Verification
  const currentPoints = Object.values(sections).filter(Boolean).length;
  const structureScore = (currentPoints / maxPossiblePoints) * 100;
  const improvementScore = Math.max(0, 100 - structureScore - suggestions.length * 5);

  return {
    suggestions: suggestions.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    improvementScore: Math.max(0, Math.min(100, improvementScore)),
    summary: generateSummary(suggestions.length, currentPoints, maxPossiblePoints),
  };
}

function generateSummary(suggestionCount: number, currentPoints: number, maxPoints: number): string {
  if (suggestionCount === 0) {
    return '✨ Prompt is well-structured! Consider adding optional improvements.';
  }

  const criticalCount = suggestionCount; // Simplified for now
  if (criticalCount >= 3) {
    return `⚠️ ${suggestionCount} suggestions could improve this prompt significantly.`;
  }

  return `💡 ${suggestionCount} suggestion${suggestionCount > 1 ? 's' : ''} to strengthen this prompt.`;
}

export function applyOptimizationSuggestion(
  prompt: string,
  suggestion: Suggestion
): string {
  // This will be implemented when we build the UI
  // For now, return the original prompt
  return prompt;
}
