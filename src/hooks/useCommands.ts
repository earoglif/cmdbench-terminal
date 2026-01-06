import { useMemo, useEffect } from 'react';
import { useCommandsStore } from '@/stores/commandsStore';
import { useCommandGroupsStore } from '@/stores/commandGroupsStore';
import { useAuthStore } from '@/stores/authStore';

export const useCommands = () => {
  const { 
    commands, 
    isLoading: commandsLoading, 
    error: commandsError,
    loadFromBulkData,
    isCommandSynced 
  } = useCommandsStore();
  
  const { 
    groups, 
    isLoading: groupsLoading, 
    error: groupsError,
    loadFromBackend,
    isGroupSynced
  } = useCommandGroupsStore();
  
  const { isAuthenticated } = useAuthStore();

  const loadData = async () => {
    if (isAuthenticated) {
      try {
        await loadFromBackend((bulkCommands, groupCommandMap) => {
          loadFromBulkData(bulkCommands, groupCommandMap);
        });
      } catch (error) {
        console.error('Failed to load data from backend:', error);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  // Мемоизируем данные для меню, чтобы они обновлялись при изменении stores
  const menuData = useMemo(() => {
    if (!isAuthenticated) {
      // Показываем только локальные команды
      const localGroups = groups.filter(group => !isGroupSynced(group.id));
      const localCommands = commands.filter(command => !isCommandSynced(command.id));
      
      return {
        groups: localGroups.map(group => ({
          ...group,
          commandIds: localCommands
            .filter(cmd => cmd.groups?.includes(group.id))
            .map(cmd => cmd.id)
        })),
        commands: localCommands
      };
    }

    // Показываем все команды для авторизованных пользователей
    return {
      groups: groups.map(group => ({
        ...group,
        commandIds: commands
          .filter(cmd => cmd.groups?.includes(group.id))
          .map(cmd => cmd.id)
      })),
      commands
    };
  }, [groups, commands, isAuthenticated, isGroupSynced, isCommandSynced]);

  return {
    data: menuData,
    loading: commandsLoading || groupsLoading,
    error: commandsError || groupsError,
    reload: loadData,
    isCommandSynced,
  };
};