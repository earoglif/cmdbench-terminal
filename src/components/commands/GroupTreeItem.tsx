import React from 'react';
import { useTranslation } from 'react-i18next';
import { CommandGroup } from '@/stores/commandGroupsStore';
import { Command } from '@/stores/commandsStore';
import { useCommandGroupsStore } from '@/stores/commandGroupsStore';
import { CommandItem } from './CommandItem';
import { IoChevronForward } from 'react-icons/io5';
import { IoMdDocument } from 'react-icons/io';
import { IoAdd } from 'react-icons/io5';
import { FiEdit, FiTrash2 } from 'react-icons/fi';

interface GroupTreeItemProps {
  group: CommandGroup;
  level: number;
  commands: Command[];
  onEditGroup: (group: CommandGroup) => void;
  onDeleteGroup: (id: string) => void;
  onAddChildGroup: (parentId: string) => void;
  onAddCommand: (groupId: string) => void;
  onEditCommand: (command: Command) => void;
  onDeleteCommand: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  getChildGroups: (parentId?: string) => CommandGroup[];
  getCommandsByGroup: (groupId?: string) => Command[];
}

export const GroupTreeItem: React.FC<GroupTreeItemProps> = ({
  group,
  level,
  commands,
  onEditGroup,
  onDeleteGroup,
  onAddChildGroup,
  onAddCommand,
  onEditCommand,
  onDeleteCommand,
  onToggleFavorite,
  getChildGroups,
  getCommandsByGroup,
}) => {
  const { t } = useTranslation();
  const { expandedGroups, toggleExpanded } = useCommandGroupsStore();
  const children = getChildGroups(group.id).sort((a, b) => a.name.localeCompare(b.name));
  const groupCommands = getCommandsByGroup(group.id).sort((a, b) => a.name.localeCompare(b.name));
  const hasChildren = children.length > 0 || groupCommands.length > 0;
  const isExpanded = expandedGroups.has(group.id);

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-base-200 group transition-colors"
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        <button
          className={`btn btn-ghost btn-xs p-0 w-6 h-6 min-h-0 ${hasChildren ? '' : 'invisible'}`}
          onClick={() => toggleExpanded(group.id)}
        >
          <IoChevronForward
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>

        <span className="flex-1 font-medium truncate">
          {group.name}
        </span>

        {groupCommands.length > 0 && (
          <span className="badge badge-sm badge-ghost">{groupCommands.length}</span>
        )}

        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
          <button
            className="btn btn-ghost btn-xs p-1"
            onClick={() => onAddCommand(group.id)}
            title={t('commands.addCommand')}
          >
            <IoMdDocument className="w-4 h-4" />
          </button>
          <button
            className="btn btn-ghost btn-xs p-1"
            onClick={() => onAddChildGroup(group.id)}
            title={t('commandGroups.addSubgroup')}
          >
            <IoAdd className="w-4 h-4" />
          </button>
          <button
            className="btn btn-ghost btn-xs p-1"
            onClick={() => onEditGroup(group)}
            title={t('commandGroups.edit')}
          >
            <FiEdit className="w-4 h-4" />
          </button>
          <button
            className="btn btn-ghost btn-xs p-1 text-error"
            onClick={() => onDeleteGroup(group.id)}
            title={t('commandGroups.delete')}
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {groupCommands.map(command => (
            <div key={command.id} style={{ paddingLeft: `${(level + 1) * 20 + 12}px` }}>
              <CommandItem
                command={command}
                onEdit={onEditCommand}
                onDelete={onDeleteCommand}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          ))}
          {children.map(child => (
            <GroupTreeItem
              key={child.id}
              group={child}
              level={level + 1}
              commands={commands}
              onEditGroup={onEditGroup}
              onDeleteGroup={onDeleteGroup}
              onAddChildGroup={onAddChildGroup}
              onAddCommand={onAddCommand}
              onEditCommand={onEditCommand}
              onDeleteCommand={onDeleteCommand}
              onToggleFavorite={onToggleFavorite}
              getChildGroups={getChildGroups}
              getCommandsByGroup={getCommandsByGroup}
            />
          ))}
        </div>
      )}
    </div>
  );
};

