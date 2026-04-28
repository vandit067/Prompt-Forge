import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { CommandCenter, TaskDetail } from './screens/CommandCenter';
import { Analytics } from './screens/Analytics';
import { Settings } from './screens/Settings';
import { colors } from './lib/designSystem';
import { api } from './lib/api';
import { scanProject, getFailureCount } from './services/claude-cli';
import { classifyTask } from './data/generators';
import type { Task, Screen, ScannedContext } from './types';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentScreen, setCurrentScreen] = useState<Screen>('command-center');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveTask, setLiveTask] = useState<Task | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [scannedContext, setScannedContext] = useState<ScannedContext | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [knownIssuesCount, setKnownIssuesCount] = useState(0);
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

  // Clicking a sidebar task stays on command-center and shows output in tab panel
  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId);
    setGenerateError(null);
    setCurrentScreen('command-center');
  }

  function handleClearSelection() {
    setSelectedTaskId(null);
    setGenerateError(null);
  }

  function handleCancel() {
    abortRef.current?.abort();
    setIsGenerating(false);
  }

  async function handleGenerate(input: string, projectPath?: string) {
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setLiveTask(null);
    setSelectedTaskId(null);
    setGenerateError(null);
    setCurrentScreen('command-center');

    try {
      const taskType = classifyTask(input);
      const { count } = await getFailureCount(taskType);
      setKnownIssuesCount(count);

      const newTask = await api.generate(input, taskType, projectPath);
      setTasks(prev => [newTask, ...prev]);
      setLiveTask(newTask);
      setSelectedTaskId(newTask.id);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Silent cancel
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setGenerateError(msg);
        console.error('Generation failed:', err);
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }

  async function handleScanProject(path: string) {
    setIsScanning(true);
    setScanError(null);
    setScannedContext(null);

    try {
      const ctx = await scanProject(path);
      setScannedContext(ctx);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
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
            generateError={generateError}
            scannedContext={scannedContext}
            isScanning={isScanning}
            scanError={scanError}
            onScanProject={handleScanProject}
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
            generateError={generateError}
            scannedContext={scannedContext}
            isScanning={isScanning}
            scanError={scanError}
            onScanProject={handleScanProject}
            knownIssuesCount={knownIssuesCount}
          />
        );
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: colors.bg,
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
