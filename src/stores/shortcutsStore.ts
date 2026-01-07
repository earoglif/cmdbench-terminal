import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const generateId = () => crypto.randomUUID();

export interface KeyboardShortcut {
  id: string;
  keys: string; // e.g., "Ctrl+T", "Ctrl+Shift+Tab"
  action: string;
  description?: string;
  commandId?: string; // For shortcuts that execute commands
  isSystem: boolean; // System shortcuts cannot be deleted
}

interface ShortcutsState {
  shortcuts: KeyboardShortcut[];
}

interface ShortcutsActions {
  addShortcut: (data: Omit<KeyboardShortcut, 'id'>) => KeyboardShortcut;
  updateShortcut: (id: string, data: Partial<Omit<KeyboardShortcut, 'id'>>) => void;
  deleteShortcut: (id: string) => void;
  getShortcutByKeys: (keys: string) => KeyboardShortcut | undefined;
  getShortcutsByCommandId: (commandId: string) => KeyboardShortcut[];
  deleteShortcutsByCommandId: (commandId: string) => void;
  initializeDefaultShortcuts: () => void;
}

type ShortcutsStore = ShortcutsState & ShortcutsActions;

const defaultSystemShortcuts: Omit<KeyboardShortcut, 'id'>[] = [
  {
    keys: 'Ctrl+T',
    action: 'newTab',
    description: 'Create new terminal tab',
    isSystem: true,
  },
  {
    keys: 'Ctrl+W',
    action: 'closeTab',
    description: 'Close current terminal tab',
    isSystem: true,
  },
  {
    keys: 'Ctrl+Tab',
    action: 'nextTab',
    description: 'Switch to next tab',
    isSystem: true,
  },
  {
    keys: 'Ctrl+Shift+Tab',
    action: 'prevTab',
    description: 'Switch to previous tab',
    isSystem: true,
  },
];

export const useShortcutsStore = create<ShortcutsStore>()(
  persist(
    (set, get) => ({
      shortcuts: [],

      initializeDefaultShortcuts: () => {
        const currentShortcuts = get().shortcuts;
        if (currentShortcuts.length === 0) {
          const initialShortcuts: KeyboardShortcut[] = defaultSystemShortcuts.map(
            (shortcut) => ({
              ...shortcut,
              id: generateId(),
            })
          );
          set({ shortcuts: initialShortcuts });
        } else {
          // Update existing system shortcuts if needed
          const updatedShortcuts = [...currentShortcuts];
          let modified = false;

          defaultSystemShortcuts.forEach((defaultShortcut) => {
            const existingIndex = updatedShortcuts.findIndex(
              (s) => s.action === defaultShortcut.action && s.isSystem
            );

            if (existingIndex === -1) {
              // Add missing system shortcut
              updatedShortcuts.push({
                ...defaultShortcut,
                id: generateId(),
              });
              modified = true;
            }
          });

          if (modified) {
            set({ shortcuts: updatedShortcuts });
          }
        }
      },

      addShortcut: (data) => {
        const newShortcut: KeyboardShortcut = {
          id: generateId(),
          ...data,
        };

        set((state) => ({
          shortcuts: [...state.shortcuts, newShortcut],
        }));

        return newShortcut;
      },

      updateShortcut: (id, data) => {
        set((state) => ({
          shortcuts: state.shortcuts.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        }));
      },

      deleteShortcut: (id) => {
        set((state) => ({
          shortcuts: state.shortcuts.filter((s) => s.id !== id),
        }));
      },

      getShortcutByKeys: (keys) => {
        return get().shortcuts.find((s) => s.keys === keys);
      },

      getShortcutsByCommandId: (commandId) => {
        return get().shortcuts.filter((s) => s.commandId === commandId);
      },

      deleteShortcutsByCommandId: (commandId) => {
        set((state) => ({
          shortcuts: state.shortcuts.filter((s) => s.commandId !== commandId),
        }));
      },
    }),
    {
      name: 'shortcuts-storage',
      partialize: (state) => ({
        shortcuts: state.shortcuts,
      }),
    }
  )
);
