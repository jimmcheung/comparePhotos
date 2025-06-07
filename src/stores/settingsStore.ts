import { create } from 'zustand';
import { Settings, ThemeMode } from '../types';
import { persist } from 'zustand/middleware';

interface ExifSettings {
  FileName: boolean;
  Resolution: boolean;
  Make: boolean;
  Model: boolean;
  LensModel: boolean;
  FocalLength: boolean;
  FNumber: boolean;
  ExposureTime: boolean;
  ISO: boolean;
  DateTimeOriginal: boolean;
}

interface SettingsStore extends Settings {
  themeMode: ThemeMode;
  syncZoom: boolean;
  syncDraw: boolean;
  presentationMode: boolean;
  visibleExifFields: string[];
  demoMode: boolean;
  exifSettings: ExifSettings;
  showZoomControls: boolean;
  showExifInfo: boolean;
  borderRadius: string;
  gridGap: string;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  toggleSyncZoom: () => void;
  toggleSyncDraw: () => void;
  togglePresentationMode: () => void;
  toggleDemoMode: () => void;
  toggleExifSetting: (key: keyof ExifSettings) => void;
  toggleExifField: (field: string) => void;
  toggleAllExifSettings: (value: boolean) => void;
  toggleShowZoomControls: () => void;
  toggleShowExifInfo: () => void;
  setBorderRadius: (value: string) => void;
  setGridGap: (value: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
  themeMode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? 'dark' 
    : 'light',
  syncZoom: true,
  syncDraw: false,
  presentationMode: false,
  visibleExifFields: ['Make', 'Model', 'ISO', 'FNumber', 'ExposureTime', 'FocalLength', 'LensModel', 'DateTimeOriginal'],
  demoMode: false,
  exifSettings: {
    FileName: false,
    Resolution: true,
    Make: true,
    Model: true,
    LensModel: false,
    FocalLength: true,
    FNumber: true,
    ExposureTime: true,
    ISO: false,
    DateTimeOriginal: false,
  },
  showZoomControls: false,
  showExifInfo: true,
  borderRadius: '0.5rem',
  gridGap: '1rem',
  setThemeMode: (mode) => set({ themeMode: mode }),
  toggleThemeMode: () => set((state) => ({ 
    themeMode: state.themeMode === 'dark' ? 'light' : 'dark' 
  })),
  toggleSyncZoom: () => set((state) => ({ syncZoom: !state.syncZoom })),
  toggleSyncDraw: () => set((state) => ({ syncDraw: !state.syncDraw })),
  togglePresentationMode: () => set((state) => ({ presentationMode: !state.presentationMode })),
  toggleDemoMode: () => set((state) => ({ demoMode: !state.demoMode })),
  toggleExifSetting: (key) => set((state) => ({
    exifSettings: {
      ...state.exifSettings,
      [key]: !state.exifSettings[key],
    },
  })),
  toggleExifField: (field) => set((state) => ({
    visibleExifFields: state.visibleExifFields.includes(field)
      ? state.visibleExifFields.filter(f => f !== field)
      : [...state.visibleExifFields, field]
  })),
  toggleAllExifSettings: (value) => set((state) => {
    const newSettings = { ...state.exifSettings };
    Object.keys(newSettings).forEach(key => {
      newSettings[key as keyof ExifSettings] = value;
    });
    return { exifSettings: newSettings };
  }),
  toggleShowZoomControls: () => set((state) => ({ showZoomControls: !state.showZoomControls })),
  toggleShowExifInfo: () => set((state) => ({ showExifInfo: !state.showExifInfo })),
  setBorderRadius: (value) => set({ borderRadius: value }),
  setGridGap: (value) => set({ gridGap: value }),
    }),
    {
      name: 'photo-compare-settings',
      partialize: (state) => ({
        themeMode: state.themeMode,
        syncZoom: state.syncZoom,
        syncDraw: state.syncDraw,
        presentationMode: state.presentationMode,
        visibleExifFields: state.visibleExifFields,
        demoMode: state.demoMode,
        exifSettings: state.exifSettings,
        showZoomControls: state.showZoomControls,
        showExifInfo: state.showExifInfo,
        borderRadius: state.borderRadius,
        gridGap: state.gridGap,
      }),
    }
  )
); 