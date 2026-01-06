import { useMemo } from 'react';
import { useCommandsStore } from '@/stores/commandsStore';
import { useCommandGroupsStore } from '@/stores/commandGroupsStore';

export const useCommands = () => {
  const { 
    commands
  } = useCommandsStore();
  
  const { 
    groups
  } = useCommandGroupsStore();

  const menuData = useMemo(() => {
    return {
      groups: groups.map(group => ({
        ...group,
        commandIds: commands
          .filter(cmd => cmd.groups?.includes(group.id))
          .map(cmd => cmd.id)
      })),
      commands
    };
  }, [groups, commands]);

  return {
    data: menuData,
  };
};
