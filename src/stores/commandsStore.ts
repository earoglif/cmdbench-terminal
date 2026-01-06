import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const generateId = () => crypto.randomUUID();

export interface CommandField {
  id: string;
  type: 'string' | 'number' | 'file' | 'directory' | 'select';
  isRequired: boolean;
  requestBeforeExecution?: boolean;
  name: string;
  description?: string;
  value: string | string[];
}

export interface Command {
  id: string;
  name: string;
  description?: string;
  command: string;
  fields: CommandField[];
  tags?: string[];
  isFavorite?: boolean;
  groups?: string[];
  executionCount?: number;
  lastExecutedAt?: string;
}

export interface CreateCommandData {
  name: string;
  description?: string;
  command: string;
  fields?: CommandField[];
  tags?: string[];
  groups?: string[];
}

interface CommandsState {
  commands: Command[];
}

interface CommandsActions {
  addCommand: (data: CreateCommandData) => Command;
  updateCommand: (id: string, data: Partial<Omit<Command, 'id'>>) => void;
  deleteCommand: (id: string) => void;
  toggleFavorite: (id: string) => void;
  getCommandsByGroup: (groupId?: string) => Command[];
  getCommandById: (id: string) => Command | undefined;
  clearError: () => void;
}

type CommandsStore = CommandsState & CommandsActions;

export const useCommandsStore = create<CommandsStore>()(
  persist(
    (set, get) => ({
      commands: [],

      addCommand: (data) => {
        const newCommand: Command = {
          id: generateId(),
          name: data.name,
          description: data.description,
          command: data.command,
          fields: data.fields || [],
          tags: data.tags || [],
          groups: data.groups || [],
          isFavorite: false,
        };

        set(state => ({
          commands: [...state.commands, newCommand],
        }));

        return newCommand;
      },

      updateCommand: (id, data) => {
        set(state => ({
          commands: state.commands.map(c =>
            c.id === id ? { ...c, ...data } : c
          ),
        }));
      },

      deleteCommand: (id) => {
        set(state => ({
          commands: state.commands.filter(c => c.id !== id),
        }));
      },

      toggleFavorite: (id) => {
        set(state => ({
          commands: state.commands.map(c =>
            c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
          ),
        }));
      },

      getCommandsByGroup: (groupId) => {
        const commands = get().commands;
        if (!groupId) {
          return commands.filter(c => !c.groups || c.groups.length === 0);
        }
        return commands.filter(c => c.groups?.includes(groupId));
      },

      getCommandById: (id) => {
        return get().commands.find(c => c.id === id);
      },

      clearError: () => {
        // No-op, kept for compatibility
      },
    }),
    {
      name: 'commands-storage',
      partialize: (state) => ({
        commands: state.commands,
      }),
    }
  )
);
