import React from 'react';
import { useTranslation } from 'react-i18next';
import { CommandGroup } from '@/stores/commandGroupsStore';
import { Command } from '@/stores/commandsStore';
import { useCommandGroupsStore } from '@/stores/commandGroupsStore';
import { CommandItem } from './CommandItem';

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
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            className="btn btn-ghost btn-xs p-1"
            onClick={() => onAddChildGroup(group.id)}
            title={t('commandGroups.addSubgroup')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            className="btn btn-ghost btn-xs p-1"
            onClick={() => onEditGroup(group)}
            title={t('commandGroups.edit')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            className="btn btn-ghost btn-xs p-1 text-error"
            onClick={() => onDeleteGroup(group.id)}
            title={t('commandGroups.delete')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
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

