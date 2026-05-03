import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { CommandCenter, TaskDetail } from './screens/CommandCenter';
import { Analytics } from './screens/Analytics';
import { Settings } from './screens/Settings';
import { colors } from './lib/designSystem';
import { api } from './lib/api';
import { scanProject, getFailureCount } from './services/claude-cli';
import { classifyTask } from './data/generators';
import type { Task, Screen, ScannedContext, ActiveBackend } from './types';

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
  const [activeBackend, setActiveBackend] = useState<ActiveBackend | null>(null);
  const [userRules, setUserRules] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api.getTasks()
      .then(saved => { setTasks(saved); setDbReady(true); })
      .catch(() => setDbReady(true));
    api.getBackend()
      .then(setActiveBackend)
      .catch(() => {});
    api.getSettings()
      .then(s => { if (s.userRules) try { setUserRules(JSON.parse(s.userRules)); } catch {} })
      .catch(() => {});
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
    console.log('handleGenerate called', { input, projectPath });
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setLiveTask(null);
    setSelectedTaskId(null);
    setGenerateError(null);
    setCurrentScreen('command-center');

    try {
      const taskType = classifyTask(input);
      console.log('Task type classified as:', taskType);
      const { count } = await getFailureCount(taskType);
      console.log('Failure count:', count);
      setKnownIssuesCount(count);

      const newTask = await api.generate(input, taskType, projectPath, scannedContext, userRules);
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

  async function handleDeleteTask(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
    try {
      await api.deleteTask(taskId);
    } catch (err) {
      console.error('Failed to delete task:', err);
      // Reload tasks on error
      const allTasks = await api.getTasks();
      setTasks(allTasks);
    }
  }

  async function handleRefine(taskId: string, refinement: string) {
    try {
      const updated = await api.refine(taskId, refinement, userRules);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      setLiveTask(updated);
    } catch (err) {
      console.error('Refinement failed:', err);
    }
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
            userRules={userRules}
            onRulesChange={setUserRules}
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
            onRefine={handleRefine}
            activeBackend={activeBackend}
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
            onRefine={handleRefine}
            activeBackend={activeBackend}
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
        onDeleteTask={handleDeleteTask}
        dbReady={dbReady}
      />
      {renderMain()}
    </div>
  );
}
