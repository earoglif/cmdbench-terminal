import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { commandsApi, Command, CommandField, CreateCommandData } from '@/shared/api/commands';

const generateId = () => crypto.randomUUID();

interface CommandsState {
  commands: Command[];
  syncedCommandIds: Set<string>;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncedAt: string | null;
}

interface BulkLoadedCommand {
  id: string;
  name: string;
  description?: string;
  command: string;
  fields: any[];
  tags: string[];
  isFavorite: boolean;
  deviceId?: string;
}

interface CommandsActions {
  addCommand: (data: CreateCommandData) => Command;
  updateCommand: (id: string, data: Partial<Omit<Command, 'id'>>) => void;
  deleteCommand: (id: string) => void;
  toggleFavorite: (id: string) => void;
  getCommandsByGroup: (groupId?: string) => Command[];
  getCommandById: (id: string) => Command | undefined;
  syncToBackend: () => Promise<void>;
  loadFromBackend: () => Promise<void>;
  loadFromBulkData: (commands: BulkLoadedCommand[], groupCommandMap: Map<string, string[]>) => void;
  clearError: () => void;
  isCommandSynced: (id: string) => boolean;
}

type CommandsStore = CommandsState & CommandsActions;

export const useCommandsStore = create<CommandsStore>()(
  persist(
    (set, get) => ({
      commands: [],
      syncedCommandIds: new Set<string>(),
      isLoading: false,
      isSyncing: false,
      error: null,
      lastSyncedAt: null,

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
        set(state => {
          const newSyncedIds = new Set(state.syncedCommandIds);
          newSyncedIds.delete(id);
          return {
            commands: state.commands.map(c =>
              c.id === id ? { ...c, ...data } : c
            ),
            syncedCommandIds: newSyncedIds,
          };
        });
      },

      deleteCommand: (id) => {
        set(state => {
          const newSyncedIds = new Set(state.syncedCommandIds);
          newSyncedIds.delete(id);
          return {
            commands: state.commands.filter(c => c.id !== id),
            syncedCommandIds: newSyncedIds,
          };
        });
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

      syncToBackend: async () => {
        set({ isSyncing: true, error: null });
        try {
          const { commands } = get();
          const commandsToSync = commands.map(c => {
            const cmd: Omit<Command, 'userId' | 'createdAt' | 'updatedAt'> = {
              id: c.id,
              name: c.name,
              command: c.command,
              fields: c.fields,
              tags: c.tags,
              isFavorite: c.isFavorite,
              description: c.description,
              deviceId: c.deviceId,
              groups: c.groups,
              executionCount: c.executionCount,
              lastExecutedAt: c.lastExecutedAt,
            };
            return cmd;
          });

          await commandsApi.bulkSaveCommands(commandsToSync);

          const commandGroupsData = commands
            .filter(c => c.groups && c.groups.length > 0)
            .map(c => ({
              commandId: c.id,
              groupIds: c.groups!.map(g => typeof g === 'string' ? g : (g as any).id).filter(Boolean),
            }))
            .filter(c => c.groupIds.length > 0);

          if (commandGroupsData.length > 0) {
            await commandsApi.bulkSaveCommandGroups(commandGroupsData);
          }

          const syncedIds = new Set(commands.map(c => c.id));
          set({
            lastSyncedAt: new Date().toISOString(),
            isSyncing: false,
            syncedCommandIds: syncedIds,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || error.message || 'Sync failed';
          set({ error: message, isSyncing: false });
          throw error;
        }
      },

      loadFromBackend: async () => {
        set({ isLoading: true, error: null });
        try {
          const cloudCommands = await commandsApi.getCommands({ includeGroups: true });

          const cloudCommandIds = new Set(cloudCommands.map(c => c.id));
          const { commands: localCommands, syncedCommandIds: oldSyncedIds } = get();

          const localOnlyCommands = localCommands.filter(
            c => !cloudCommandIds.has(c.id) && !oldSyncedIds.has(c.id)
          );

          const mergedCommands = [...cloudCommands, ...localOnlyCommands];
          const newSyncedIds = new Set(cloudCommands.map(c => c.id));

          set({
            commands: mergedCommands,
            lastSyncedAt: new Date().toISOString(),
            isLoading: false,
            syncedCommandIds: newSyncedIds,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || error.message || 'Load failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      loadFromBulkData: (bulkCommands, groupCommandMap) => {
        const cloudCommands: Command[] = bulkCommands.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          command: c.command,
          fields: c.fields || [],
          tags: c.tags || [],
          isFavorite: c.isFavorite || false,
          deviceId: c.deviceId,
          groups: groupCommandMap.get(c.id) || [],
        }));

        const cloudCommandIds = new Set(cloudCommands.map(c => c.id));
        const { commands: localCommands, syncedCommandIds: oldSyncedIds } = get();

        const localOnlyCommands = localCommands.filter(
          c => !cloudCommandIds.has(c.id) && !oldSyncedIds.has(c.id)
        );

        const mergedCommands = [...cloudCommands, ...localOnlyCommands];
        const newSyncedIds = new Set(cloudCommands.map(c => c.id));

        set({
          commands: mergedCommands,
          lastSyncedAt: new Date().toISOString(),
          syncedCommandIds: newSyncedIds,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      isCommandSynced: (id) => {
        return get().syncedCommandIds.has(id);
      },
    }),
    {
      name: 'commands-storage',
      partialize: (state) => ({
        commands: state.commands,
        syncedCommandIds: Array.from(state.syncedCommandIds),
        lastSyncedAt: state.lastSyncedAt,
      }),
      merge: (persisted: any, current) => ({
        ...current,
        ...persisted,
        syncedCommandIds: new Set(persisted?.syncedCommandIds || []),
      }),
    }
  )
);

export type { Command, CommandField, CreateCommandData };

