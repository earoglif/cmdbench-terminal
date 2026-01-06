import { create } from 'zustand';
import i18n from '@/localization';
import { TerminalTab, ShellProfile } from '@/types/terminal';

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;
}

interface TerminalActions {
  addTab: (shellProfile?: ShellProfile) => void;
  addSettingsTab: () => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  renameTab: (id: string, newTitle: string) => void;
  updateTabTitleFromPath: (id: string, path: string) => void;
  reorderTabs: (activeId: string, overId: string) => void;
}

type TerminalStore = TerminalState & TerminalActions;

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  tabs: [{ id: '1', title: 'Terminal 1', isActive: true }],
  activeTabId: '1',

  addTab: (shellProfile?: ShellProfile) => {
    const newId = Date.now().toString();
    const title = shellProfile ? shellProfile.name : `Terminal ${get().tabs.length + 1}`;
    const newTab: TerminalTab = {
      id: newId,
      title,
      isActive: true,
      shellProfile
    };

    set((state) => ({
      tabs: state.tabs.map(tab => ({ ...tab, isActive: false })).concat(newTab),
      activeTabId: newId
    }));
  },

  addSettingsTab: () => {
    const { tabs } = get();
    const existingSettingsTab = tabs.find(tab => tab.isSettings);

    if (existingSettingsTab) {
      set((state) => ({
        tabs: state.tabs.map(tab => ({ ...tab, isActive: tab.id === existingSettingsTab.id })),
        activeTabId: existingSettingsTab.id
      }));
      return;
    }

    const newId = Date.now().toString();
    const newTab: TerminalTab = {
      id: newId,
      title: i18n.t('settings.title'),
      isActive: true,
      isSettings: true
    };

    set((state) => ({
      tabs: state.tabs.map(tab => ({ ...tab, isActive: false })).concat(newTab),
      activeTabId: newId
    }));
  },

  removeTab: (id: string) => {
    const { tabs, activeTabId } = get();
    const filtered = tabs.filter(tab => tab.id !== id);

    if (id === activeTabId && filtered.length > 0) {
      const newActiveTab = filtered[0];
      set({
        tabs: filtered.map(tab => ({ ...tab, isActive: tab.id === newActiveTab.id })),
        activeTabId: newActiveTab.id
      });
    } else {
      set({ tabs: filtered });
    }
  },

  setActiveTab: (id: string) => {
    set((state) => ({
      tabs: state.tabs.map(tab => ({ ...tab, isActive: tab.id === id })),
      activeTabId: id
    }));
  },

  renameTab: (id: string, newTitle: string) => {
    set((state) => ({
      tabs: state.tabs.map(tab =>
        tab.id === id ? { ...tab, title: newTitle } : tab
      )
    }));
  },

  updateTabTitleFromPath: (id: string, path: string) => {
    set((state) => ({
      tabs: state.tabs.map(tab =>
        tab.id === id ? { ...tab, title: path } : tab
      )
    }));
  },

  reorderTabs: (activeId: string, overId: string) => {
    set((state) => {
      const activeIndex = state.tabs.findIndex(tab => tab.id === activeId);
      const overIndex = state.tabs.findIndex(tab => tab.id === overId);

      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
        return state;
      }

      const newTabs = [...state.tabs];
      const [removed] = newTabs.splice(activeIndex, 1);
      newTabs.splice(overIndex, 0, removed);

      return { tabs: newTabs };
    });
  }
}));

