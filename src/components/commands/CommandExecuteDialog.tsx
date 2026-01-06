import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { CommandField } from '@/shared/api/commands';

interface FieldValue {
  id: string;
  value: string;
}

interface CommandExecuteDialogProps {
  isOpen: boolean;
  commandName: string;
  fields: CommandField[];
  onExecute: (fieldValues: FieldValue[]) => void;
  onCancel: () => void;
}

export const CommandExecuteDialog: React.FC<CommandExecuteDialogProps> = ({
  isOpen,
  commandName,
  fields,
  onExecute,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach(f => {
      initial[f.id] = Array.isArray(f.value) ? f.value[0] || '' : (f.value || '');
    });
    return initial;
  });

  const handleValueChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFileSelect = async (fieldId: string) => {
    try {
      const selected = await open({ multiple: false, directory: false });
      if (selected && typeof selected === 'string') {
        handleValueChange(fieldId, selected);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
    }
  };

  const handleDirectorySelect = async (fieldId: string) => {
    try {
      const selected = await open({ multiple: false, directory: true });
      if (selected && typeof selected === 'string') {
        handleValueChange(fieldId, selected);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values = fields.map(f => ({ id: f.id, value: fieldValues[f.id] || '' }));
    onExecute(values);
  };

  const isFormValid = () => {
    return fields.every(f => !f.isRequired || (fieldValues[f.id] && fieldValues[f.id].trim() !== ''));
  };

  const renderField = (field: CommandField) => {
    const value = fieldValues[field.id] || '';
    const isEditable = field.requestBeforeExecution;
    const isRequired = field.isRequired;

    switch (field.type) {
      case 'string':
        return (
          <input
            type="text"
            className="input input-bordered input-sm w-full"
            value={value}
            onChange={e => handleValueChange(field.id, e.target.value)}
            disabled={!isEditable}
            required={isRequired}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className="input input-bordered input-sm w-full"
            value={value}
            onChange={e => handleValueChange(field.id, e.target.value)}
            disabled={!isEditable}
            required={isRequired}
          />
        );

      case 'file':
        return (
          <div className="flex gap-2">
            <input
              type="text"
              className="input input-bordered input-sm flex-1"
              value={value}
              onChange={e => handleValueChange(field.id, e.target.value)}
              disabled={!isEditable}
              required={isRequired}
            />
            {isEditable && (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => handleFileSelect(field.id)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
            )}
          </div>
        );

      case 'directory':
        return (
          <div className="flex gap-2">
            <input
              type="text"
              className="input input-bordered input-sm flex-1"
              value={value}
              onChange={e => handleValueChange(field.id, e.target.value)}
              disabled={!isEditable}
              required={isRequired}
            />
            {isEditable && (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => handleDirectorySelect(field.id)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
            )}
          </div>
        );

      case 'select': {
        const options = Array.isArray(field.value) 
          ? field.value 
          : (field.value || '').split('\n').filter(Boolean);
        return (
          <select
            className="select select-bordered select-sm w-full"
            value={value}
            onChange={e => handleValueChange(field.id, e.target.value)}
            disabled={!isEditable}
            required={isRequired}
          >
            {options.map((opt, idx) => (
              <option key={idx} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg mb-4">{commandName}</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {fields.map(field => (
              <div key={field.id} className="form-control">
                <label className="label py-1">
                  <span className="label-text">
                    {field.name}
                    {field.isRequired && <span className="text-error ml-1">*</span>}
                  </span>
                </label>
                {field.description && (
                  <p className="text-xs text-base-content/60 mb-1">{field.description}</p>
                )}
                {renderField(field)}
              </div>
            ))}
          </div>

          <div className="modal-action mt-6">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              {t('commandExecute.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isFormValid()}
            >
              {t('commandExecute.execute')}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onCancel} />
    </div>
  );
};
