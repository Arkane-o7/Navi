import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_CONFIG } from '../config';
import { useAuthStore } from './authStore';
import { logger } from '../../shared/logger';

export interface SettingsState {
  // Appearance
  theme: 'system' | 'dark' | 'light';

  // Docking
  dockBehavior: 'right' | 'left';
  
  // AI Settings
  model: string;
  historyWindowSize: number;
  
  // Actions
  setTheme: (theme: 'system' | 'dark' | 'light') => void;
  setDockBehavior: (behavior: 'right' | 'left') => void;
  setModel: (model: string) => void;
  setHistoryWindowSize: (size: number) => void;

  // Cloud sync
  syncFromCloud: () => Promise<void>;
  syncToCloud: (patch?: Partial<Pick<SettingsState, 'theme' | 'dockBehavior' | 'model' | 'historyWindowSize'>>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Defaults
      theme: 'dark',
      dockBehavior: 'right',
      model: 'llama-3.3-70b-versatile',
      historyWindowSize: 20,
      
      // Actions
      setTheme: (theme) => set({ theme }),
      setDockBehavior: (behavior) => set({ dockBehavior: behavior }),
      setModel: (model) => set({ model }),
      setHistoryWindowSize: (size) => set({ historyWindowSize: size }),

      syncFromCloud: async () => {
        const accessToken = useAuthStore.getState().accessToken;
        if (!accessToken) return;

        try {
          const response = await fetch(`${API_CONFIG.baseUrl}/api/preferences`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!response.ok) return;

          const payload = await response.json();
          const preferences = payload?.data?.preferences;
          if (!preferences) return;

          set({
            theme: preferences.theme,
            dockBehavior: preferences.dockBehavior,
            model: preferences.model,
            historyWindowSize: preferences.historyWindowSize,
          });
        } catch (error) {
          logger.error('[SettingsStore] syncFromCloud failed:', error);
        }
      },

      syncToCloud: async (patch) => {
        const accessToken = useAuthStore.getState().accessToken;
        if (!accessToken) return;

        const currentState = useSettingsStore.getState();
        const payload = {
          theme: patch?.theme ?? currentState.theme,
          dockBehavior: patch?.dockBehavior ?? currentState.dockBehavior,
          model: patch?.model ?? currentState.model,
          historyWindowSize: patch?.historyWindowSize ?? currentState.historyWindowSize,
        };

        try {
          await fetch(`${API_CONFIG.baseUrl}/api/preferences`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
          });
        } catch (error) {
          logger.error('[SettingsStore] syncToCloud failed:', error);
        }
      },
    }),
    {
      name: 'navi-settings',
    }
  )
);
