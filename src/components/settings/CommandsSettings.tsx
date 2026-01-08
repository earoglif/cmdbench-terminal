import React, { useState, useCallback, useRef } from 'react';
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
import { IoDocumentText, IoAdd, IoFolderOpen, IoSave } from 'react-icons/io5';
import { validateExportData, createExportData } from '@/utils/dataValidation';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const CommandsSettings: React.FC = () => {
  const { t } = useTranslation();
  const {
    groups,
    getChildGroups,
    addGroup,
    updateGroup,
    deleteGroup: deleteGroupFromStore,
    exportData: exportGroups,
    importData: importGroups,
  } = useCommandGroupsStore();

  const {
    commands,
    getCommandsByGroup,
    addCommand,
    updateCommand,
    deleteCommand: deleteCommandFromStore,
    toggleFavorite,
    exportData: exportCommands,
    importData: importCommands,
  } = useCommandsStore();

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast state for notifications
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

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

  const rootGroups = getChildGroups(undefined).sort((a, b) => a.name.localeCompare(b.name));
  const ungroupedCommands = getCommandsByGroup(undefined).sort((a, b) => a.name.localeCompare(b.name));

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

  const handleSaveGroup = useCallback((data: { name: string; description?: string; parentId?: string }) => {
    if (editingGroup?.id) {
      updateGroup(editingGroup.id, data);
    } else {
      addGroup(data.name, data.parentId, undefined, data.description);
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

  // Export/Import handlers
  const handleExport = useCallback(async () => {
    try {
      const exportData = createExportData(exportCommands(), exportGroups());
      const json = JSON.stringify(exportData, null, 2);
      
      const filePath = await save({
        defaultPath: `commands-export-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{
          name: 'JSON',
          extensions: ['json']
        }]
      });
      
      if (filePath) {
        await writeTextFile(filePath, json);
        setToast({ show: true, message: t('commands.exportSuccess'), type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      }
    } catch (error) {
      console.error('Export error:', error);
      setToast({ show: true, message: t('commands.importError'), type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
    }
  }, [exportCommands, exportGroups, t]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        
        if (!validateExportData(data)) {
          setToast({ show: true, message: t('commands.importValidationError'), type: 'error' });
          setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
          return;
        }
        
        importCommands(data.commands);
        importGroups(data.groups);
        
        setToast({ show: true, message: t('commands.importSuccess'), type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      } catch (error) {
        console.error('Import error:', error);
        setToast({ show: true, message: t('commands.importFileError'), type: 'error' });
        setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
      }
    };
    
    reader.onerror = () => {
      setToast({ show: true, message: t('commands.importFileError'), type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
    };
    
    reader.readAsText(file);
    
    // Reset input so the same file can be loaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [importCommands, importGroups, t]);

  return (
    <div>
      {/* Toast notification */}
      {toast.show && (
        <div className="toast toast-top toast-end z-50">
          <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        style={{ display: 'none' }}
      />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('commands.title')}</h2>
        <div className="flex gap-2">
          {/* <button
            className="btn btn-outline btn-sm"
            onClick={handleExport}
            title={t('commands.exportData')}
          >
            <IoDownload className="w-4 h-4 mr-1" />
            {t('commands.exportData')}
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleImportClick}
            title={t('commands.importData')}
          >
            <IoCloudUpload className="w-4 h-4 mr-1" />
            {t('commands.importData')}
          </button> */}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleAddCommand()}
          >
            <IoDocumentText className="w-4 h-4 mr-1" />
            {t('commands.addCommand')}
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleAddGroup()}
          >
            <IoAdd className="w-4 h-4 mr-1" />
            {t('commandGroups.addGroup')}
          </button>
          <div className='dropdown dropdown-end'>
            <div tabIndex={0} role="button" className='btn btn-outline btn-sm'>
              <IoSave className="w-4 h-4 mr-1" />
            </div>
            <ul className='menu dropdown-content bg-base-200 rounded-box w-52 p-2 mt-3 shadow z-10'>
              <li><a onClick={handleExport}>{t('commands.exportData')}</a></li>
              <li><a onClick={handleImportClick}>{t('commands.importData')}</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-base-100 min-h-[300px]">
        {rootGroups.length === 0 && ungroupedCommands.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-base-content/60">
            <IoFolderOpen className="w-16 h-16 mb-4 opacity-50" />
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
