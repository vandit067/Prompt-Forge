import { useState, useEffect } from 'react';
import type { AppSettings, Backend, Model } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  backend: 'anthropic',
  model: 'claude-haiku-4-5-20251001',
  defaultTaskType: 'NEW_FEATURE',
  autoSaveInterval: 2000,
  theme: 'system',
  promptStyle: 'verbose',
  enableLivePreview: false,
};

const STORAGE_KEY = 'prompt-forge-settings';

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettingsState({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        console.error('Failed to parse settings');
        setSettingsState(DEFAULT_SETTINGS);
      }
    } else {
      setSettingsState(DEFAULT_SETTINGS);
    }
    setIsLoaded(true);
  }, []);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettingsState(prev => {
      const newSettings = { ...prev, ...updates };
      // Don't store API key in localStorage - use sessionStorage or memory only
      const toStore = { ...newSettings };
      delete (toStore as any).apiKey;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      return newSettings;
    });
  };

  const setApiKey = (key: string) => {
    setSettingsState(prev => ({ ...prev, apiKey: key }));
  };

  const clearApiKey = () => {
    setSettingsState(prev => {
      const newSettings = { ...prev };
      delete newSettings.apiKey;
      return newSettings;
    });
  };

  const resetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSettingsState(DEFAULT_SETTINGS);
  };

  return {
    settings,
    isLoaded,
    updateSettings,
    setApiKey,
    clearApiKey,
    resetToDefaults,
  };
}
