import React, { useState, useEffect, useRef, createRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MentionsInput, Mention, OnChangeHandlerFunc } from 'react-mentions';
import { Command, CommandField, CreateCommandData } from '@/stores/commandsStore';
import { CommandGroup } from '@/shared/api/commandGroups';
import { CommandFieldEditor, CommandFieldEditorRef } from './CommandFieldEditor';

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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [commandText, setCommandText] = useState('');
  const [fields, setFields] = useState<CommandField[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'fields' | 'groups'>('basic');

  const fieldRefs = useRef<React.RefObject<CommandFieldEditorRef>[]>([]);
  const commandInputRef = useRef<HTMLTextAreaElement>(null);

  const handleCommandChange: OnChangeHandlerFunc = (event) => {
    setCommandText(event.target.value);
  };

  useEffect(() => {
    if (isOpen) {
      if (command) {
        setName(command.name);
        setDescription(command.description || '');
        setCommandText(command.command);
        setFields(command.fields.map(f => ({ ...f, id: f.id || generateId() })));
        // Ensure groups are string IDs, not objects
        const groupIds = (command.groups || []).map(g => typeof g === 'string' ? g : (g as any).id).filter(Boolean);
        setSelectedGroups(groupIds);
        setTags(command.tags?.join(', ') || '');
        fieldRefs.current = command.fields.map(() => createRef<CommandFieldEditorRef>());
      } else {
        setName('');
        setDescription('');
        setCommandText('');
        setFields([]);
        setSelectedGroups(initialGroupId ? [initialGroupId] : []);
        setTags('');
        fieldRefs.current = [];
      }
      setActiveTab('basic');
    }
  }, [isOpen, command, initialGroupId]);

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
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
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
          <div className="flex-1 overflow-y-auto">
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
                  {/* @ts-expect-error - react-mentions types conflict with React 18 */}
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
                    {/* @ts-expect-error - react-mentions types conflict with React 18 */}
                    <Mention
                      trigger="#"
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
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('commands.addField')}
                  </button>
                </div>

                {fields.length === 0 ? (
                  <div className="text-center py-8 text-base-content/50">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
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
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: group.color || '#6b7280' }}
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
            <button type="button" className="btn btn-ghost" onClick={onClose}>
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
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </div>
  );
};

