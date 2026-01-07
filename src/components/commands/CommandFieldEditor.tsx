import { useImperativeHandle, forwardRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { CommandField } from '@/stores/commandsStore';
import { IoChevronForward } from 'react-icons/io5';
import { FiFolder, FiTrash2 } from 'react-icons/fi';

interface CommandFieldEditorProps {
  field: CommandField;
  onDelete: () => void;
  onChange?: (field: CommandField) => void;
}

export interface CommandFieldEditorRef {
  getData: () => CommandField;
}

export const CommandFieldEditor = forwardRef<CommandFieldEditorRef, CommandFieldEditorProps>(({
  field,
  onDelete,
  onChange
}, ref) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CommandField>(field);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setFormData(field);
  }, [field.id]);

  useImperativeHandle(ref, () => ({
    getData: () => formData
  }));

  const handleChange = (updates: Partial<CommandField>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    onChange?.(newData);
  };

  const handleFileSelect = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
      });
      if (selected && typeof selected === 'string') {
        handleChange({ value: selected });
      }
    } catch (error) {
      console.error('Error selecting file:', error);
    }
  };

  const handleDirectorySelect = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: true,
      });
      if (selected && typeof selected === 'string') {
        handleChange({ value: selected });
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
    }
  };

  const renderValueField = () => {
    switch (formData.type) {
      case 'string':
        return (
          <input
            type="text"
            className="input input-bordered input-sm w-full"
            value={formData.value as string}
            onChange={e => handleChange({ value: e.target.value })}
            placeholder={t('commands.field.defaultValue')}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className="input input-bordered input-sm w-full"
            value={formData.value as string}
            onChange={e => handleChange({ value: e.target.value })}
            placeholder={t('commands.field.defaultValue')}
          />
        );

      case 'file':
        return (
          <div className="flex gap-2">
            <input
              type="text"
              className="input input-bordered input-sm flex-1"
              value={formData.value as string}
              onChange={e => handleChange({ value: e.target.value })}
              placeholder={t('commands.field.defaultPath')}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={handleFileSelect}
            >
              <FiFolder className="w-4 h-4" />
            </button>
          </div>
        );

      case 'directory':
        return (
          <div className="flex gap-2">
            <input
              type="text"
              className="input input-bordered input-sm flex-1"
              value={formData.value as string}
              onChange={e => handleChange({ value: e.target.value })}
              placeholder={t('commands.field.defaultPath')}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={handleDirectorySelect}
            >
              <FiFolder className="w-4 h-4" />
            </button>
          </div>
        );

      case 'select':
        return (
          <textarea
            className="textarea textarea-bordered textarea-sm w-full"
            value={formData.value as string}
            onChange={e => handleChange({ value: e.target.value })}
            placeholder={t('commands.field.selectOptions')}
            rows={2}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="border border-base-300 rounded-lg bg-base-100">
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-base-200"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <IoChevronForward
          className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
        />
        <span className="font-medium flex-1">
          {formData.name || t('commands.field.unnamed')}
        </span>
        <span className="badge badge-sm badge-ghost">{formData.type}</span>
        {formData.isRequired && (
          <span className="badge badge-sm badge-warning">{t('commands.field.required')}</span>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-xs text-error"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <FiTrash2 className="w-4 h-4" />
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3 pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-sm">{t('commands.field.name')}</span>
              </label>
              <input
                type="text"
                className="input input-bordered input-sm"
                value={formData.name}
                onChange={e => handleChange({ name: e.target.value })}
                placeholder={t('commands.field.namePlaceholder')}
              />
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-sm">{t('commands.field.type')}</span>
              </label>
              <select
                className="select select-bordered select-sm"
                value={formData.type}
                onChange={e => handleChange({ type: e.target.value as CommandField['type'] })}
              >
                <option value="string">{t('commands.field.types.string')}</option>
                <option value="number">{t('commands.field.types.number')}</option>
                <option value="file">{t('commands.field.types.file')}</option>
                <option value="directory">{t('commands.field.types.directory')}</option>
                <option value="select">{t('commands.field.types.select')}</option>
              </select>
            </div>
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-sm">{t('commands.field.description')}</span>
            </label>
            <input
              type="text"
              className="input input-bordered input-sm"
              value={formData.description || ''}
              onChange={e => handleChange({ description: e.target.value })}
              placeholder={t('commands.field.descriptionPlaceholder')}
            />
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-sm">{t('commands.field.value')}</span>
            </label>
            {renderValueField()}
          </div>

          <div className="flex gap-4">
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={formData.isRequired}
                onChange={e => handleChange({ isRequired: e.target.checked })}
              />
              <span className="label-text text-sm">{t('commands.field.isRequired')}</span>
            </label>

            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={formData.requestBeforeExecution || false}
                onChange={e => handleChange({ requestBeforeExecution: e.target.checked })}
              />
              <span className="label-text text-sm">{t('commands.field.requestBeforeExecution')}</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
});

CommandFieldEditor.displayName = 'CommandFieldEditor';

