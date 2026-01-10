import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsState {
  // Appearance
  theme: 'system' | 'dark' | 'light';
  
  // AI Settings
  model: string;
  historyWindowSize: number;
  
  // Actions
  setTheme: (theme: 'system' | 'dark' | 'light') => void;
  setModel: (model: string) => void;
  setHistoryWindowSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Defaults
      theme: 'dark',
      model: 'llama-3.3-70b-versatile',
      historyWindowSize: 20,
      
      // Actions
      setTheme: (theme) => set({ theme }),
      setModel: (model) => set({ model }),
      setHistoryWindowSize: (size) => set({ historyWindowSize: size }),
    }),
    {
      name: 'navi-settings',
    }
  )
);
