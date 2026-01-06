import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCommandGroupsStore, CommandGroup } from '@/stores/commandGroupsStore';
import { useCommandsStore, Command, CreateCommandData } from '@/stores/commandsStore';
import {
  GroupTreeItem,
  GroupModal,
  CommandModal,
  CommandItem,
  DeleteConfirmModal,
} from '@/components/commands';

const CommandsSettings: React.FC = () => {
  const { t } = useTranslation();
  const {
    groups,
    getChildGroups,
    addGroup,
    updateGroup,
    deleteGroup: deleteGroupFromStore,
  } = useCommandGroupsStore();

  const {
    commands,
    getCommandsByGroup,
    addCommand,
    updateCommand,
    deleteCommand: deleteCommandFromStore,
    toggleFavorite,
  } = useCommandsStore();

  // Group modal state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CommandGroup | null>(null);
  const [newGroupParentId, setNewGroupParentId] = useState<string | undefined>();

  // Command modal state
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [newCommandGroupId, setNewCommandGroupId] = useState<string | undefined>();

  // Delete confirm modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'group' | 'command';
    id: string;
    name: string;
  }>({
    isOpen: false,
    type: 'group',
    id: '',
    name: '',
  });

  // View state
  const [viewMode, setViewMode] = useState<'tree' | 'ungrouped'>('tree');

  const rootGroups = getChildGroups(undefined);
  const ungroupedCommands = getCommandsByGroup(undefined);

  // Group handlers
  const handleAddGroup = useCallback((parentId?: string) => {
    setEditingGroup(null);
    setNewGroupParentId(parentId);
    setIsGroupModalOpen(true);
  }, []);

  const handleEditGroup = useCallback((group: CommandGroup) => {
    setEditingGroup(group);
    setNewGroupParentId(undefined);
    setIsGroupModalOpen(true);
  }, []);

  const handleDeleteGroup = useCallback((id: string) => {
    const group = groups.find(g => g.id === id);
    if (group) {
      setDeleteConfirm({
        isOpen: true,
        type: 'group',
        id,
        name: group.name,
      });
    }
  }, [groups]);

  const handleSaveGroup = useCallback((data: { name: string; description?: string; color?: string; parentId?: string }) => {
    if (editingGroup?.id) {
      updateGroup(editingGroup.id, data);
    } else {
      addGroup(data.name, data.parentId, data.color, data.description);
    }
  }, [editingGroup, updateGroup, addGroup]);

  // Command handlers
  const handleAddCommand = useCallback((groupId?: string) => {
    setEditingCommand(null);
    setNewCommandGroupId(groupId);
    setIsCommandModalOpen(true);
  }, []);

  const handleEditCommand = useCallback((command: Command) => {
    setEditingCommand(command);
    setNewCommandGroupId(undefined);
    setIsCommandModalOpen(true);
  }, []);

  const handleDeleteCommand = useCallback((id: string) => {
    const command = commands.find(c => c.id === id);
    if (command) {
      setDeleteConfirm({
        isOpen: true,
        type: 'command',
        id,
        name: command.name,
      });
    }
  }, [commands]);

  const handleSaveCommand = useCallback((data: CreateCommandData, id?: string) => {
    if (id) {
      updateCommand(id, data);
    } else {
      addCommand(data);
    }
  }, [updateCommand, addCommand]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirm.type === 'group') {
      deleteGroupFromStore(deleteConfirm.id);
    } else {
      deleteCommandFromStore(deleteConfirm.id);
    }
  }, [deleteConfirm, deleteGroupFromStore, deleteCommandFromStore]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('commands.title')}</h2>
        <div className="flex gap-2">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleAddCommand()}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('commands.addCommand')}
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleAddGroup()}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('commandGroups.addGroup')}
          </button>
        </div>
      </div>


      <div className="tabs tabs-boxed mb-4">
        <button
          className={`tab ${viewMode === 'tree' ? 'tab-active' : ''}`}
          onClick={() => setViewMode('tree')}
        >
          {t('commands.groupedView')}
        </button>
        <button
          className={`tab ${viewMode === 'ungrouped' ? 'tab-active' : ''}`}
          onClick={() => setViewMode('ungrouped')}
        >
          {t('commands.ungroupedView')} {ungroupedCommands.length > 0 && `(${ungroupedCommands.length})`}
        </button>
      </div>

      <div className="bg-base-100 border border-base-300 rounded-lg min-h-[300px]">
        {viewMode === 'tree' ? (
          rootGroups.length === 0 && commands.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-base-content/60">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-lg mb-2">{t('commands.noCommandsOrGroups')}</p>
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleAddCommand()}
                >
                  {t('commands.createFirstCommand')}
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleAddGroup()}
                >
                  {t('commandGroups.createFirstGroup')}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-2">
              {rootGroups.map(group => (
                <GroupTreeItem
                  key={group.id}
                  group={group}
                  level={0}
                  commands={commands}
                  onEditGroup={handleEditGroup}
                  onDeleteGroup={handleDeleteGroup}
                  onAddChildGroup={handleAddGroup}
                  onAddCommand={handleAddCommand}
                  onEditCommand={handleEditCommand}
                  onDeleteCommand={handleDeleteCommand}
                  onToggleFavorite={toggleFavorite}
                  getChildGroups={getChildGroups}
                  getCommandsByGroup={getCommandsByGroup}
                />
              ))}
            </div>
          )
        ) : (
          ungroupedCommands.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-base-content/60">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg mb-2">{t('commands.noUngroupedCommands')}</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleAddCommand()}
              >
                {t('commands.createCommand')}
              </button>
            </div>
          ) : (
            <div className="py-2">
              {ungroupedCommands.map(command => (
                <CommandItem
                  key={command.id}
                  command={command}
                  onEdit={handleEditCommand}
                  onDelete={handleDeleteCommand}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )
        )}
      </div>

      <GroupModal
        isOpen={isGroupModalOpen}
        group={editingGroup}
        parentId={newGroupParentId}
        allGroups={groups}
        onSave={handleSaveGroup}
        onClose={() => setIsGroupModalOpen(false)}
      />

      <CommandModal
        isOpen={isCommandModalOpen}
        command={editingCommand}
        groups={groups}
        initialGroupId={newCommandGroupId}
        onSave={handleSaveCommand}
        onClose={() => setIsCommandModalOpen(false)}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={
          deleteConfirm.type === 'group'
            ? t('commandGroups.confirmDelete')
            : t('commands.confirmDelete')
        }
        message={
          deleteConfirm.type === 'group'
            ? t('commandGroups.confirmDeleteMessage', { name: deleteConfirm.name })
            : t('commands.confirmDeleteMessage', { name: deleteConfirm.name })
        }
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteConfirm({ isOpen: false, type: 'group', id: '', name: '' })}
      />
    </div>
  );
};

export default CommandsSettings;
