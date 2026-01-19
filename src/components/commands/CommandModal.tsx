import React, { useState, useEffect, useRef, createRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MentionsInput, Mention, OnChangeHandlerFunc } from 'react-mentions';
import { Command, CommandField, CreateCommandData } from '@/stores/commandsStore';
import { CommandGroup } from '@/stores/commandGroupsStore';
import { CommandFieldEditor, CommandFieldEditorRef } from './CommandFieldEditor';
import { IoAdd } from 'react-icons/io5';
import { TbListDetails } from 'react-icons/tb';
import { UnsavedChangesConfirmModal } from '@/components/UnsavedChangesConfirmModal';

interface CommandModalProps {
  isOpen: boolean;
  command: Command | null;
  groups: CommandGroup[];
  initialGroupId?: string;
  onSave: (data: CreateCommandData, id?: string) => void;
  onClose: () => void;
}

const generateId = () => crypto.randomUUID();

export const CommandModal: React.FC<CommandModalProps> = ({
  isOpen,
  command,
  groups,
  initialGroupId,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initialDataRef = useRef<{
    name: string;
    description: string;
    commandText: string;
    fields: CommandField[];
    selectedGroups: string[];
    tags: string;
  } | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [commandText, setCommandText] = useState('');
  const [fields, setFields] = useState<CommandField[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'fields' | 'groups'>('basic');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fieldRefs = useRef<React.RefObject<CommandFieldEditorRef>[]>([]);
  const commandInputRef = useRef<HTMLTextAreaElement>(null);

  const handleCommandChange: OnChangeHandlerFunc = (event) => {
    setCommandText(event.target.value);
  };

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (!isOpen && dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      let initialName = '';
      let initialDescription = '';
      let initialCommandText = '';
      let initialFields: CommandField[] = [];
      let initialSelectedGroups: string[] = [];
      let initialTags = '';

      if (command) {
        initialName = command.name;
        initialDescription = command.description || '';
        initialCommandText = command.command;
        initialFields = command.fields.map(f => ({ ...f, id: f.id || generateId() }));
        // Ensure groups are string IDs, not objects
        const groupIds = (command.groups || []).map(g => typeof g === 'string' ? g : (g as any).id).filter(Boolean);
        initialSelectedGroups = groupIds;
        initialTags = command.tags?.join(', ') || '';
      } else {
        initialSelectedGroups = initialGroupId ? [initialGroupId] : [];
      }

      setName(initialName);
      setDescription(initialDescription);
      setCommandText(initialCommandText);
      setFields(initialFields);
      setSelectedGroups(initialSelectedGroups);
      setTags(initialTags);
      fieldRefs.current = initialFields.map(() => createRef<CommandFieldEditorRef>());
      initialDataRef.current = {
        name: initialName,
        description: initialDescription,
        commandText: initialCommandText,
        fields: initialFields,
        selectedGroups: initialSelectedGroups,
        tags: initialTags,
      };
      setActiveTab('basic');
      setConfirmOpen(false);
    }
  }, [isOpen, command, initialGroupId]);

  const normalizeTags = (value: string) =>
    value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)
      .join(',');

  const normalizeFields = (items: CommandField[]) =>
    items.map(field => ({
      id: field.id,
      type: field.type,
      isRequired: field.isRequired,
      requestBeforeExecution: field.requestBeforeExecution,
      name: field.name,
      description: field.description,
      value: field.value,
    }));

  const serializeSnapshot = (snapshot: {
    name: string;
    description: string;
    commandText: string;
    fields: CommandField[];
    selectedGroups: string[];
    tags: string;
  }) =>
    JSON.stringify({
      name: snapshot.name,
      description: snapshot.description,
      commandText: snapshot.commandText,
      fields: normalizeFields(snapshot.fields),
      selectedGroups: [...snapshot.selectedGroups].sort(),
      tags: normalizeTags(snapshot.tags),
    });

  const isDirty = useMemo(() => {
    if (!isOpen || !initialDataRef.current) return false;
    const currentSnapshot = {
      name,
      description,
      commandText,
      fields,
      selectedGroups,
      tags,
    };
    return serializeSnapshot(currentSnapshot) !== serializeSnapshot(initialDataRef.current);
  }, [isOpen, name, description, commandText, fields, selectedGroups, tags]);

  const handleAddField = () => {
    const newField: CommandField = {
      id: generateId(),
      type: 'string',
      isRequired: false,
      requestBeforeExecution: false,
      name: '',
      description: '',
      value: ''
    };
    setFields([...fields, newField]);
    fieldRefs.current.push(createRef<CommandFieldEditorRef>());
  };

  const handleDeleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
    fieldRefs.current.splice(index, 1);
  };

  const handleFieldChange = (index: number, updatedField: CommandField) => {
    setFields(prev => {
      const newFields = [...prev];
      newFields[index] = updatedField;
      return newFields;
    });
  };

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const getGroupPath = (groupId: string): string => {
    const path: string[] = [];
    let current = groups.find(g => g.id === groupId);
    while (current) {
      path.unshift(current.name);
      current = current.parentId ? groups.find(g => g.id === current!.parentId) : undefined;
    }
    return path.join(' / ');
  };

  const handleCloseModal = () => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
    onClose();
  };

  const handleRequestClose = () => {
    if (isDirty) {
      setConfirmOpen(true);
      return;
    }
    handleCloseModal();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !commandText.trim()) return;

    const fieldsData = fieldRefs.current
      .map(ref => ref?.current?.getData())
      .filter((field): field is CommandField => field !== undefined && field !== null);

    const data: CreateCommandData = {
      name: name.trim(),
      description: description.trim() || undefined,
      command: commandText,
      fields: fieldsData.length > 0 ? fieldsData : fields,
      groups: selectedGroups.length > 0 ? selectedGroups : undefined,
      tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    };

    onSave(data, command?.id);
    handleCloseModal();
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        className="modal"
        onCancel={(event) => {
          event.preventDefault();
          handleRequestClose();
        }}
      >
        <div className="modal-box max-w-2xl max-h-[90vh] flex flex-col">
          <h3 className="font-bold text-lg mb-4">
            {command ? t('commands.editCommand') : t('commands.createCommand')}
          </h3>

          <div className="tabs tabs-boxed mb-4">
            <button
              type="button"
              className={`tab ${activeTab === 'basic' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              {t('commands.tabs.basic')}
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'fields' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('fields')}
            >
              {t('commands.tabs.fields')} {fields.length > 0 && `(${fields.length})`}
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'groups' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('groups')}
            >
              {t('commands.tabs.groups')} {selectedGroups.length > 0 && `(${selectedGroups.length})`}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto overflow-hidden">
              {activeTab === 'basic' && (
                <div className="space-y-4 p-1">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">{t('commands.name')}</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={t('commands.namePlaceholder')}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">{t('commands.description')}</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder={t('commands.descriptionPlaceholder')}
                      rows={2}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">{t('commands.command')}</span>
                    </label>
                    <MentionsInput
                      inputRef={commandInputRef}
                      value={commandText}
                      onChange={handleCommandChange}
                      placeholder={t('commands.commandPlaceholder')}
                      className="mentions-input"
                      autoCapitalize="off"
                      autoComplete="off"
                      autoCorrect="off"
                    >
                      <Mention
                        trigger={/(#([^\s#]*))$/}
                        markup="#[__display__](__id__)"
                        displayTransform={(_id, name) => `#${name}`}
                        data={fields
                          .filter(field => field.name)
                          .map(field => ({
                            id: field.id,
                            display: field.name
                          }))}
                        appendSpaceOnAdd
                        style={{ backgroundColor: '#4b4b4b' }}
                      />
                    </MentionsInput>
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        {t('commands.commandHint')}
                      </span>
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">{t('commands.tags')}</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={tags}
                      onChange={e => setTags(e.target.value)}
                      placeholder={t('commands.tagsPlaceholder')}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'fields' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-base-content/70">
                      {t('commands.fieldsDescription')}
                    </p>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={handleAddField}
                    >
                      <IoAdd className="w-4 h-4 mr-1" />
                      {t('commands.addField')}
                    </button>
                  </div>

                  {fields.length === 0 ? (
                    <div className="text-center py-8 text-base-content/50">
                      <TbListDetails className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>{t('commands.noFields')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {fields.map((field, index) => {
                        if (!fieldRefs.current[index]) {
                          fieldRefs.current[index] = createRef<CommandFieldEditorRef>();
                        }
                        return (
                          <CommandFieldEditor
                            key={field.id}
                            ref={fieldRefs.current[index]}
                            field={field}
                            onDelete={() => handleDeleteField(index)}
                            onChange={(updatedField) => handleFieldChange(index, updatedField)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'groups' && (
                <div className="space-y-3">
                  <p className="text-sm text-base-content/70">
                    {t('commands.groupsDescription')}
                  </p>

                  {groups.length === 0 ? (
                    <div className="text-center py-8 text-base-content/50">
                      <p>{t('commands.noGroupsAvailable')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groups.map(group => (
                        <label
                          key={group.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-base-300 hover:bg-base-200 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={selectedGroups.includes(group.id)}
                            onChange={() => handleToggleGroup(group.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{getGroupPath(group.id)}</p>
                            {group.description && (
                              <p className="text-sm text-base-content/60 truncate">{group.description}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-action mt-4 pt-4 border-t border-base-300">
              <button type="button" className="btn btn-ghost" onClick={handleRequestClose}>
                {t('commands.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!name.trim() || !commandText.trim()}
              >
                {t('commands.save')}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={(event) => {
          event.preventDefault();
          handleRequestClose();
        }}>
          <button type="button">close</button>
        </form>
      </dialog>
      <UnsavedChangesConfirmModal
        isOpen={confirmOpen}
        onDiscard={() => {
          setConfirmOpen(false);
          handleCloseModal();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
};

