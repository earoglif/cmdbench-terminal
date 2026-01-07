import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MdModeEdit, MdStop } from "react-icons/md";
import { useShortcutsStore, KeyboardShortcut } from '@/stores/shortcutsStore';
import { useCommandsStore } from '@/stores/commandsStore';

interface ShortcutEditorModalProps {
  isOpen: boolean;
  shortcut: KeyboardShortcut | null;
  onSave: (data: Omit<KeyboardShortcut, 'id'>) => void;
  onClose: () => void;
}

const ShortcutEditorModal: React.FC<ShortcutEditorModalProps> = ({
  isOpen,
  shortcut,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const { commands } = useCommandsStore();
  const { getShortcutByKeys } = useShortcutsStore();
  
  const [keys, setKeys] = useState('');
  const [commandId, setCommandId] = useState('');
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (shortcut) {
        setKeys(shortcut.keys);
        setCommandId(shortcut.commandId || '');
        setDescription(shortcut.description || '');
      } else {
        setKeys('');
        setCommandId('');
        setDescription('');
      }
      setError('');
      setIsRecording(false);
    }
  }, [isOpen, shortcut]);

  const normalizeKeys = (event: KeyboardEvent): string => {
    const parts: string[] = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    const key = event.key;
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      if (key === ' ') {
        parts.push('Space');
      } else if (key.length === 1) {
        parts.push(key.toUpperCase());
      } else {
        parts.push(key);
      }
    }
    
    return parts.join('+');
  };

  const handleKeyDown = React.useCallback((event: KeyboardEvent) => {
    if (!isRecording) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const normalizedKeys = normalizeKeys(event);
    // Only stop recording when we have a complete combination (not just modifiers)
    // A complete combination must have at least one non-modifier key
    const hasNonModifier = !['Control', 'Alt', 'Shift', 'Meta'].includes(event.key);
    if (normalizedKeys && hasNonModifier && !normalizedKeys.endsWith('+')) {
      setKeys(normalizedKeys);
      setIsRecording(false);
      setError('');
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [isRecording, handleKeyDown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keys.trim()) {
      setError(t('shortcuts.keysPlaceholder'));
      return;
    }

    if (!shortcut?.isSystem && !commandId) {
      setError(t('shortcuts.selectCommand'));
      return;
    }

    // Check if keys are already in use (except for current shortcut)
    const existingShortcut = getShortcutByKeys(keys);
    if (existingShortcut && existingShortcut.id !== shortcut?.id) {
      setError(t('shortcuts.keysInUse'));
      return;
    }

    const data: Omit<KeyboardShortcut, 'id'> = {
      keys: keys.trim(),
      action: shortcut?.action || 'executeCommand',
      description: description.trim() || undefined,
      commandId: shortcut?.isSystem ? undefined : (commandId || undefined),
      isSystem: shortcut?.isSystem || false,
    };

    onSave(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg mb-4">
          {shortcut ? t('shortcuts.editShortcut') : t('shortcuts.addShortcut')}
        </h3>

        {shortcut?.isSystem && (
          <div className="alert alert-info mb-4 text-sm">
            {t('shortcuts.systemShortcutCanEdit')}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">{t('shortcuts.keys')}</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  value={keys}
                  placeholder={t('shortcuts.keysPlaceholder')}
                  readOnly
                  required
                />
                <button
                  type="button"
                  className={`btn ${isRecording ? 'btn-error' : 'btn-primary'}`}
                  onClick={() => setIsRecording(!isRecording)}
                >
                  {isRecording ? <MdStop className="w-4 h-4" title={t('shortcuts.stopRecording')} /> : <MdModeEdit className="w-4 h-4" title={t('shortcuts.recordKeys')} />}
                </button>
              </div>
              {isRecording && (
                <label className="label">
                  <span className="label-text-alt text-warning">{t('shortcuts.recording')}</span>
                </label>
              )}
            </div>

            {!shortcut?.isSystem && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">{t('shortcuts.command')}</span>
                </label>
                <select
                  className="select select-bordered"
                  value={commandId}
                  onChange={(e) => setCommandId(e.target.value)}
                  required
                >
                  <option value="">{t('shortcuts.selectCommand')}</option>
                  {commands.map((cmd) => (
                    <option key={cmd.id} value={cmd.id}>
                      {cmd.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {shortcut?.isSystem && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">{t('shortcuts.action')}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={t(`shortcuts.actions.${shortcut.action}`)}
                  readOnly
                  disabled
                />
              </div>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">{t('shortcuts.description')}</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('shortcuts.descriptionPlaceholder')}
                rows={2}
              />
            </div>

            {error && (
              <div className="alert alert-error">
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>

          <div className="modal-action mt-6">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t('shortcuts.cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('shortcuts.save')}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </div>
  );
};

export default ShortcutEditorModal;
