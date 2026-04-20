import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { CommandCenter, TaskDetail } from './screens/CommandCenter';
import { Analytics } from './screens/Analytics';
import { Settings } from './screens/Settings';
import { api } from './lib/api';
import { generateTask, CliNotInstalledError, GenerationCancelledError } from './services/claude-cli';
import type { Task, Screen } from './types';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentScreen, setCurrentScreen] = useState<Screen>('command-center');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveTask, setLiveTask] = useState<Task | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [cliError, setCliError] = useState<'not_installed' | 'generation_failed' | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api.getTasks()
      .then(saved => { setTasks(saved); setDbReady(true); })
      .catch(() => setDbReady(true));
  }, []);

  const selectedTask = tasks.find(t => t.id === selectedTaskId) ?? null;

  function handleNavigate(screen: Screen) {
    setCurrentScreen(screen);
    if (screen !== 'command-center' && screen !== 'task-detail') {
      setSelectedTaskId(null);
    }
  }

  // Clicking a sidebar task stays on command-center and loads output in tab panel
  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId);
    setCurrentScreen('command-center');
  }

  function handleClearSelection() {
    setSelectedTaskId(null);
  }

  async function handleGenerate(input: string, projectPath?: string) {
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setLiveTask(null);
    setSelectedTaskId(null);
    setCurrentScreen('command-center');
    setCliError(null);

    try {
      const task = await generateTask(input, projectPath, controller.signal);
      setTasks(prev => [task, ...prev]);
      setLiveTask(task);
    } catch (err) {
      if (err instanceof CliNotInstalledError) {
        setCliError('not_installed');
      } else if (err instanceof GenerationCancelledError) {
        // Silent cancel, don't show error
      } else if (err instanceof Error && err.name === 'AbortError') {
        // Silent abort, don't show error
      } else {
        setCliError('generation_failed');
        console.error('Generation failed:', err);
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setIsGenerating(false);
  }

  async function handleUpdateStatus(taskId: string, status: 'success' | 'error', notes?: string) {
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, status, errorNotes: notes ?? t.errorNotes, updatedAt: new Date().toISOString() }
          : t
      )
    );
    api.updateStatus(taskId, status, notes).catch(console.error);
  }

  function handleRetry(task: Task) {
    const retryInput = task.errorNotes
      ? `${task.input}\n\nKNOWN ISSUE: ${task.errorNotes}`
      : task.input;
    setCurrentScreen('command-center');
    setSelectedTaskId(null);
    handleGenerate(retryInput, task.projectPath);
  }

  function handleImport(importedTasks: Task[]) {
    setTasks(prev => {
      const existing = new Set(prev.map(t => t.id));
      const fresh = importedTasks.filter(t => !existing.has(t.id));
      return [...fresh, ...prev];
    });
  }

  function handleResetPatterns() {
    setTasks(prev => prev.map(t => ({ ...t, errorNotes: undefined })));
  }

  function renderMain() {
    switch (currentScreen) {
      case 'analytics':
        return <Analytics tasks={tasks} />;

      case 'settings':
        return (
          <Settings
            tasks={tasks}
            onImport={handleImport}
            onResetPatterns={handleResetPatterns}
          />
        );

      case 'task-detail':
        if (selectedTask) {
          return (
            <TaskDetail
              task={selectedTask}
              onUpdateStatus={handleUpdateStatus}
              onRetry={handleRetry}
            />
          );
        }
        return (
          <CommandCenter
            onGenerate={handleGenerate}
            currentTask={liveTask}
            isGenerating={isGenerating}
            selectedTask={selectedTask}
            onClearSelection={handleClearSelection}
            onCancel={handleCancel}
            cliError={cliError}
            onClearError={() => setCliError(null)}
          />
        );

      case 'command-center':
      default:
        return (
          <CommandCenter
            onGenerate={handleGenerate}
            currentTask={liveTask}
            isGenerating={isGenerating}
            selectedTask={selectedTask}
            onClearSelection={handleClearSelection}
            onCancel={handleCancel}
            cliError={cliError}
            onClearError={() => setCliError(null)}
          />
        );
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: '#09090b',
        overflow: 'hidden',
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      }}
    >
      <Sidebar
        tasks={tasks}
        currentScreen={currentScreen}
        selectedTaskId={selectedTaskId}
        onNavigate={handleNavigate}
        onSelectTask={handleSelectTask}
        dbReady={dbReady}
      />
      {renderMain()}
    </div>
  );
}
