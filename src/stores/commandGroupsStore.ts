import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { commandGroupsApi, CommandGroup, BulkLoadResponse } from '@/shared/api/commandGroups';

const generateId = () => crypto.randomUUID();

interface CommandGroupsState {
  groups: CommandGroup[];
  expandedGroups: Set<string>;
  syncedGroupIds: Set<string>;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncedAt: string | null;
}

interface CommandGroupsActions {
  addGroup: (name: string, parentId?: string, color?: string, description?: string) => CommandGroup;
  updateGroup: (id: string, data: Partial<Omit<CommandGroup, 'id'>>) => void;
  deleteGroup: (id: string) => void;
  moveGroup: (id: string, newParentId: string | null) => void;
  reorderGroups: (parentId: string | null, orderedIds: string[]) => void;
  toggleExpanded: (id: string) => void;
  setExpanded: (id: string, expanded: boolean) => void;
  syncToBackend: () => Promise<void>;
  loadFromBackend: (onCommandsLoaded?: (commands: BulkLoadResponse['commands'], groupCommandMap: Map<string, string[]>) => void) => Promise<void>;
  clearError: () => void;
  getChildGroups: (parentId?: string) => CommandGroup[];
  getGroupPath: (id: string) => CommandGroup[];
  isGroupSynced: (id: string) => boolean;
}

type CommandGroupsStore = CommandGroupsState & CommandGroupsActions;

export const useCommandGroupsStore = create<CommandGroupsStore>()(
  persist(
    (set, get) => ({
      groups: [],
      expandedGroups: new Set<string>(),
      syncedGroupIds: new Set<string>(),
      isLoading: false,
      isSyncing: false,
      error: null,
      lastSyncedAt: null,

      addGroup: (name, parentId, color, description) => {
        const siblings = get().groups.filter(g => g.parentId === parentId);
        const maxSortOrder = Math.max(0, ...siblings.map(g => g.sortOrder));
        
        const newGroup: CommandGroup = {
          id: generateId(),
          name,
          parentId,
          color,
          description,
          sortOrder: maxSortOrder + 1,
        };

        set(state => ({
          groups: [...state.groups, newGroup],
        }));

        return newGroup;
      },

      updateGroup: (id, data) => {
        set(state => {
          const newSyncedIds = new Set(state.syncedGroupIds);
          newSyncedIds.delete(id);
          return {
            groups: state.groups.map(g => 
              g.id === id ? { ...g, ...data } : g
            ),
            syncedGroupIds: newSyncedIds,
          };
        });
      },

      deleteGroup: (id) => {
        const deleteRecursive = (groupId: string, allGroups: CommandGroup[]): string[] => {
          const children = allGroups.filter(g => g.parentId === groupId);
          const childIds = children.flatMap(c => deleteRecursive(c.id, allGroups));
          return [groupId, ...childIds];
        };

        set(state => {
          const idsToDelete = deleteRecursive(id, state.groups);
          const newExpanded = new Set(state.expandedGroups);
          const newSyncedIds = new Set(state.syncedGroupIds);
          idsToDelete.forEach(deleteId => {
            newExpanded.delete(deleteId);
            newSyncedIds.delete(deleteId);
          });
          
          return {
            groups: state.groups.filter(g => !idsToDelete.includes(g.id)),
            expandedGroups: newExpanded,
            syncedGroupIds: newSyncedIds,
          };
        });
      },

      moveGroup: (id, newParentId) => {
        const state = get();
        const group = state.groups.find(g => g.id === id);
        if (!group) return;

        if (newParentId === id) return;

        const isDescendant = (potentialDescendantId: string | null, ancestorId: string): boolean => {
          if (!potentialDescendantId) return false;
          if (potentialDescendantId === ancestorId) return true;
          const parent = state.groups.find(g => g.id === potentialDescendantId);
          return parent?.parentId ? isDescendant(parent.parentId, ancestorId) : false;
        };

        if (newParentId && isDescendant(newParentId, id)) return;

        const siblings = state.groups.filter(g => g.parentId === newParentId);
        const maxSortOrder = Math.max(0, ...siblings.map(g => g.sortOrder));

        set(state => {
          const newSyncedIds = new Set(state.syncedGroupIds);
          newSyncedIds.delete(id);
          return {
            groups: state.groups.map(g =>
              g.id === id ? { ...g, parentId: newParentId || undefined, sortOrder: maxSortOrder + 1 } : g
            ),
            syncedGroupIds: newSyncedIds,
          };
        });
      },

      reorderGroups: (parentId, orderedIds) => {
        set(state => ({
          groups: state.groups.map(g => {
            if (g.parentId === parentId) {
              const newIndex = orderedIds.indexOf(g.id);
              if (newIndex !== -1) {
                return { ...g, sortOrder: newIndex };
              }
            }
            return g;
          }),
        }));
      },

      toggleExpanded: (id) => {
        set(state => {
          const newExpanded = new Set(state.expandedGroups);
          if (newExpanded.has(id)) {
            newExpanded.delete(id);
          } else {
            newExpanded.add(id);
          }
          return { expandedGroups: newExpanded };
        });
      },

      setExpanded: (id, expanded) => {
        set(state => {
          const newExpanded = new Set(state.expandedGroups);
          if (expanded) {
            newExpanded.add(id);
          } else {
            newExpanded.delete(id);
          }
          return { expandedGroups: newExpanded };
        });
      },

      syncToBackend: async () => {
        set({ isSyncing: true, error: null });
        try {
          const { groups } = get();
          const groupsToSync = groups.map(g => ({
            id: g.id,
            parentId: g.parentId || null,
            name: g.name,
            description: g.description,
            color: g.color,
            sortOrder: g.sortOrder,
          }));
          
          await commandGroupsApi.bulkSaveGroups(groupsToSync);
          const syncedIds = new Set(groups.map(g => g.id));
          set({ 
            lastSyncedAt: new Date().toISOString(), 
            isSyncing: false,
            syncedGroupIds: syncedIds,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || error.message || 'Sync failed';
          set({ error: message, isSyncing: false });
          throw error;
        }
      },

      loadFromBackend: async (onCommandsLoaded) => {
        set({ isLoading: true, error: null });
        try {
          const data = await commandGroupsApi.bulkLoad();
          
          // Build a map of commandId -> groupIds from the groups data
          const groupCommandMap = new Map<string, string[]>();
          data.groups.forEach(g => {
            g.commandIds.forEach(cmdId => {
              const existing = groupCommandMap.get(cmdId) || [];
              existing.push(g.id);
              groupCommandMap.set(cmdId, existing);
            });
          });
          
          const cloudGroups: CommandGroup[] = data.groups.map(g => ({
            id: g.id,
            parentId: g.parentId,
            name: g.name,
            description: g.description,
            color: g.color,
            sortOrder: g.sortOrder,
            commandCount: g.commandIds.length,
          }));
          
          const cloudGroupIds = new Set(cloudGroups.map(g => g.id));
          const { groups: localGroups, syncedGroupIds: oldSyncedIds } = get();
          
          const localOnlyGroups = localGroups.filter(g => !cloudGroupIds.has(g.id) && !oldSyncedIds.has(g.id));
          
          const mergedGroups = [...cloudGroups, ...localOnlyGroups];
          const newSyncedIds = new Set(cloudGroups.map(g => g.id));
          
          set({ 
            groups: mergedGroups, 
            lastSyncedAt: new Date().toISOString(), 
            isLoading: false,
            syncedGroupIds: newSyncedIds,
          });
          
          // Notify about loaded commands if callback provided
          if (onCommandsLoaded && data.commands) {
            onCommandsLoaded(data.commands, groupCommandMap);
          }
        } catch (error: any) {
          const message = error.response?.data?.message || error.message || 'Load failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      getChildGroups: (parentId) => {
        return get().groups
          .filter(g => g.parentId === parentId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },

      getGroupPath: (id) => {
        const path: CommandGroup[] = [];
        let current = get().groups.find(g => g.id === id);
        
        while (current) {
          path.unshift(current);
          current = current.parentId 
            ? get().groups.find(g => g.id === current!.parentId) 
            : undefined;
        }
        
        return path;
      },

      isGroupSynced: (id) => {
        return get().syncedGroupIds.has(id);
      },
    }),
    {
      name: 'command-groups-storage',
      partialize: (state) => ({
        groups: state.groups,
        expandedGroups: Array.from(state.expandedGroups),
        syncedGroupIds: Array.from(state.syncedGroupIds),
        lastSyncedAt: state.lastSyncedAt,
      }),
      merge: (persisted: any, current) => ({
        ...current,
        ...persisted,
        expandedGroups: new Set(persisted?.expandedGroups || []),
        syncedGroupIds: new Set(persisted?.syncedGroupIds || []),
      }),
    }
  )
);

