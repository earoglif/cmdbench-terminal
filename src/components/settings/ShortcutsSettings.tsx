import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useShortcutsStore, KeyboardShortcut } from '@/stores/shortcutsStore';
import { useCommandsStore } from '@/stores/commandsStore';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import ShortcutEditorModal from './ShortcutEditorModal';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-sm">
        <h3 className="font-bold text-lg mb-4">{t('shortcuts.confirmDelete')}</h3>
        <p className="mb-6">{t('shortcuts.confirmDeleteMessage')}</p>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onCancel}>
            {t('shortcuts.cancel')}
          </button>
          <button className="btn btn-error" onClick={onConfirm}>
            {t('shortcuts.delete')}
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onCancel} />
    </div>
  );
};

const ShortcutsSettings: React.FC = () => {
  const { t } = useTranslation();
  const { shortcuts, addShortcut, updateShortcut, deleteShortcut, initializeDefaultShortcuts } =
    useShortcutsStore();
  const { commands } = useCommandsStore();
  
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<KeyboardShortcut | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingShortcutId, setDeletingShortcutId] = useState<string | null>(null);

  useEffect(() => {
    initializeDefaultShortcuts();
  }, []);

  const systemShortcuts = shortcuts.filter((s) => s.isSystem);
  const commandShortcuts = shortcuts.filter((s) => !s.isSystem);

  const handleAddShortcut = () => {
    setEditingShortcut(null);
    setEditorModalOpen(true);
  };

  const handleEditShortcut = (shortcut: KeyboardShortcut) => {
    setEditingShortcut(shortcut);
    setEditorModalOpen(true);
  };

  const handleSaveShortcut = (data: Omit<KeyboardShortcut, 'id'>) => {
    if (editingShortcut) {
      updateShortcut(editingShortcut.id, data);
    } else {
      addShortcut(data);
    }
  };

  const handleDeleteClick = (shortcutId: string) => {
    const shortcut = shortcuts.find((s) => s.id === shortcutId);
    if (shortcut?.isSystem) {
      return; // Cannot delete system shortcuts
    }
    setDeletingShortcutId(shortcutId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingShortcutId) {
      deleteShortcut(deletingShortcutId);
    }
    setDeleteModalOpen(false);
    setDeletingShortcutId(null);
  };

  const getCommandName = (commandId?: string) => {
    if (!commandId) return t('shortcuts.noCommand');
    const command = commands.find((c) => c.id === commandId);
    return command?.name || t('shortcuts.noCommand');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">{t('shortcuts.title')}</h2>
      </div>

      {/* System Shortcuts */}
      <div>
        <h3 className="text-lg font-semibold mb-3">{t('shortcuts.systemShortcuts')}</h3>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>{t('shortcuts.keys')}</th>
                <th>{t('shortcuts.action')}</th>
                <th>{t('shortcuts.description')}</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {systemShortcuts.map((shortcut) => (
                <tr key={shortcut.id}>
                  <td>
                    <kbd className="kbd">{shortcut.keys}</kbd>
                  </td>
                  <td>{t(`shortcuts.actions.${shortcut.action}`)}</td>
                  <td className="text-sm text-base-content/70">
                    {shortcut.description || t(`shortcuts.actions.${shortcut.action}`)}
                  </td>
                  <td>
                    <div className="flex gap-2 justify-end">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleEditShortcut(shortcut)}
                        title={t('shortcuts.edit')}
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Command Shortcuts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{t('shortcuts.commandShortcuts')}</h3>
          <button className="btn btn-primary btn-sm" onClick={handleAddShortcut}>
            <FiPlus className="w-4 h-4" />
            {t('shortcuts.addShortcut')}
          </button>
        </div>

        {commandShortcuts.length === 0 ? (
          <div className="text-center py-12 bg-base-200 rounded-lg">
            <p className="text-base-content/60 mb-4">{t('shortcuts.noCommandShortcuts')}</p>
            <button className="btn btn-primary" onClick={handleAddShortcut}>
              <FiPlus className="w-4 h-4" />
              {t('shortcuts.createFirstShortcut')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>{t('shortcuts.keys')}</th>
                  <th>{t('shortcuts.command')}</th>
                  <th>{t('shortcuts.description')}</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {commandShortcuts.map((shortcut) => (
                  <tr key={shortcut.id}>
                    <td>
                      <kbd className="kbd">{shortcut.keys}</kbd>
                    </td>
                    <td>{getCommandName(shortcut.commandId)}</td>
                    <td className="text-sm text-base-content/70">
                      {shortcut.description || ''}
                    </td>
                    <td>
                      <div className="flex gap-2 justify-end">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleEditShortcut(shortcut)}
                          title={t('shortcuts.edit')}
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm text-error"
                          onClick={() => handleDeleteClick(shortcut.id)}
                          title={t('shortcuts.delete')}
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ShortcutEditorModal
        isOpen={editorModalOpen}
        shortcut={editingShortcut}
        onSave={handleSaveShortcut}
        onClose={() => setEditorModalOpen(false)}
      />

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default ShortcutsSettings;

