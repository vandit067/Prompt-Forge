export type TaskType =
  | 'NEW_TOOL'
  | 'NEW_FEATURE'
  | 'BUG_FIX'
  | 'CODE_REVIEW'
  | 'REFACTOR'
  | 'DEBUG_INVESTIGATION'
  | 'DESIGN_DECISION'
  | 'PERF_OPTIMIZATION'
  | 'DATA_INTEGRATION'
  | 'DOC_OR_SPEC'
  | 'API_DESIGN'
  | 'SECURITY_AUDIT'
  | 'TEST_STRATEGY'
  | 'ARCH_DECISION'
  | 'MONITORING_SETUP';

export type TaskStatus = 'pending' | 'success' | 'error';

export type Screen = 'command-center' | 'analytics' | 'settings' | 'task-detail';

export type Backend = 'anthropic' | 'ollama' | 'script';

export type Model = 'claude-opus-4-7' | 'claude-sonnet-4-6' | 'claude-haiku-4-5';

export interface AppSettings {
  // API Configuration
  apiKey?: string;
  backend: Backend;
  model: Model;

  // Application Preferences
  defaultTaskType: TaskType;
  autoSaveInterval: number; // milliseconds, 0 = disabled
  theme: 'light' | 'dark' | 'system';
  promptStyle: 'verbose' | 'concise';

  // Feature Flags
  enableLivePreview: boolean;
}

export type ProjectMode = 'new' | 'existing';

export interface ScannedFile {
  filename: string;
  found: boolean;
  excerpt?: string;
}

export interface ScannedContext {
  projectPath: string;
  techStack: string[];
  packageMgr?: string | null;
  scripts?: Record<string, string>;
  hooks?: string[];
  keyFiles: ScannedFile[];
  rules: string[];
  specPurpose?: string;
  hasCompanionFiles: boolean;
  promptBlock: string;
}

export type OutputTab = 'prompts' | 'files' | 'plan' | 'checklist';

export interface ActiveBackend {
  backend: 'anthropic' | 'ollama' | 'script';
  model: string | null;
}

export interface GeneratedPrompt {
  id: string;
  sessionLabel: string;
  content: string;
}

export interface GeneratedFile {
  id: string;
  filename: string;
  content: string;
}

export interface PlanStep {
  session: number;
  title: string;
  description: string;
  estimatedTime: string;
}

export interface Task {
  id: string;
  title: string;
  input: string;
  taskType: TaskType;
  projectPath?: string;
  projectContext?: string;
  generatedPrompts: GeneratedPrompt[];
  generatedFiles: GeneratedFile[];
  generatedPlan: PlanStep[];
  generatedChecklist: string[];
  status: TaskStatus;
  errorNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTypeConfig {
  label: string;
  color: string;
  bg: string;
}

export const TASK_TYPE_CONFIG: Record<TaskType, TaskTypeConfig> = {
  NEW_TOOL:           { label: 'NEW_TOOL',           color: '#93c5fd', bg: '#1e3a5f' },
  NEW_FEATURE:        { label: 'NEW_FEATURE',         color: '#86efac', bg: '#14532d' },
  BUG_FIX:            { label: 'BUG_FIX',             color: '#fca5a5', bg: '#5f1d1d' },
  CODE_REVIEW:        { label: 'CODE_REVIEW',         color: '#fcd34d', bg: '#5f3e0a' },
  REFACTOR:           { label: 'REFACTOR',            color: '#d8b4fe', bg: '#3b1f5e' },
  DEBUG_INVESTIGATION:{ label: 'DEBUG',               color: '#fdba74', bg: '#5f2c0a' },
  DESIGN_DECISION:    { label: 'DESIGN',              color: '#5eead4', bg: '#0f3d38' },
  PERF_OPTIMIZATION:  { label: 'PERF',                color: '#f9a8d4', bg: '#5f1d3b' },
  DATA_INTEGRATION:   { label: 'DATA',                color: '#67e8f9', bg: '#0f3d4a' },
  DOC_OR_SPEC:        { label: 'DOC_OR_SPEC',         color: '#a1a1aa', bg: '#27272a' },
  API_DESIGN:         { label: 'API_DESIGN',          color: '#94a3b8', bg: '#1e293b' },
  SECURITY_AUDIT:     { label: 'SECURITY',            color: '#e7755e', bg: '#3b1f15' },
  TEST_STRATEGY:      { label: 'TEST',                color: '#84cc16', bg: '#3f4900' },
  ARCH_DECISION:      { label: 'ARCH',                color: '#fb923c', bg: '#5a2e0a' },
  MONITORING_SETUP:   { label: 'MONITORING',          color: '#ec4899', bg: '#3f1f40' },
};
