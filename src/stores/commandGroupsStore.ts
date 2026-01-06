import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const generateId = () => crypto.randomUUID();

export interface CommandGroup {
  id: string;
  parentId?: string;
  name: string;
  description?: string;
  color?: string;
  sortOrder: number;
  commandCount?: number;
}

interface CommandGroupsState {
  groups: CommandGroup[];
  expandedGroups: Set<string>;
}

interface CommandGroupsActions {
  addGroup: (name: string, parentId?: string, color?: string, description?: string) => CommandGroup;
  updateGroup: (id: string, data: Partial<Omit<CommandGroup, 'id'>>) => void;
  deleteGroup: (id: string) => void;
  moveGroup: (id: string, newParentId: string | null) => void;
  reorderGroups: (parentId: string | null, orderedIds: string[]) => void;
  toggleExpanded: (id: string) => void;
  setExpanded: (id: string, expanded: boolean) => void;
  clearError: () => void;
  getChildGroups: (parentId?: string) => CommandGroup[];
  getGroupPath: (id: string) => CommandGroup[];
}

type CommandGroupsStore = CommandGroupsState & CommandGroupsActions;

export const useCommandGroupsStore = create<CommandGroupsStore>()(
  persist(
    (set, get) => ({
      groups: [],
      expandedGroups: new Set<string>(),

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
        set(state => ({
          groups: state.groups.map(g => 
            g.id === id ? { ...g, ...data } : g
          ),
        }));
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
          idsToDelete.forEach(deleteId => {
            newExpanded.delete(deleteId);
          });
          
          return {
            groups: state.groups.filter(g => !idsToDelete.includes(g.id)),
            expandedGroups: newExpanded,
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

        set(state => ({
          groups: state.groups.map(g =>
            g.id === id ? { ...g, parentId: newParentId || undefined, sortOrder: maxSortOrder + 1 } : g
          ),
        }));
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

      clearError: () => {
        // No-op, kept for compatibility
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
    }),
    {
      name: 'command-groups-storage',
      partialize: (state) => ({
        groups: state.groups,
        expandedGroups: Array.from(state.expandedGroups),
      }),
      merge: (persisted: any, current) => ({
        ...current,
        ...persisted,
        expandedGroups: new Set(persisted?.expandedGroups || []),
      }),
    }
  )
);
