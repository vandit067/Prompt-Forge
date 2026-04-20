import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { CommandCenter, TaskDetail } from './screens/CommandCenter';
import { Analytics } from './screens/Analytics';
import { Settings } from './screens/Settings';
import { generateFakeTask } from './data/generators';
import { api } from './lib/api';
import type { Task, Screen } from './types';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentScreen, setCurrentScreen] = useState<Screen>('command-center');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveTask, setLiveTask] = useState<Task | null>(null);
  const [dbReady, setDbReady] = useState(false);

  // Load persisted tasks from SQLite on mount
  useEffect(() => {
    api.getTasks()
      .then(saved => {
        setTasks(saved);
        setDbReady(true);
      })
      .catch(() => {
        // API not running — start with empty list, still show the UI
        setDbReady(true);
      });
  }, []);

  const selectedTask = tasks.find(t => t.id === selectedTaskId) ?? null;

  function handleNavigate(screen: Screen) {
    setCurrentScreen(screen);
    if (screen !== 'task-detail') setSelectedTaskId(null);
  }

  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId);
    setCurrentScreen('task-detail');
  }

  async function handleGenerate(input: string, projectPath?: string) {
    setIsGenerating(true);
    setLiveTask(null);
    setCurrentScreen('command-center');
    setSelectedTaskId(null);

    await new Promise(res => setTimeout(res, 1600));

    const newTask = generateFakeTask(input, projectPath);

    // Optimistically add to UI first so sidebar updates immediately
    setTasks(prev => [newTask, ...prev]);
    setLiveTask(newTask);
    setIsGenerating(false);

    // Persist to SQLite in the background
    api.saveTask(newTask).catch(console.error);
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
          />
        );

      case 'command-center':
      default:
        return (
          <CommandCenter
            onGenerate={handleGenerate}
            currentTask={liveTask}
            isGenerating={isGenerating}
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
