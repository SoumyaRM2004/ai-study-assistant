import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  chatSidebarOpen: boolean;
  setChatSidebarOpen: (open: boolean) => void;
  pdfWidth: number; // percentage (e.g. 60)
  setPdfWidth: (width: number) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  chatSidebarOpen: true,
  setChatSidebarOpen: (open) => set({ chatSidebarOpen: open }),
  pdfWidth: 60,
  setPdfWidth: (width) => set({ pdfWidth: Math.max(30, Math.min(80, width)) }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
