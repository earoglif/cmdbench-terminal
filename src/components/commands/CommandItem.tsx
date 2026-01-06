import React from 'react';
import { useTranslation } from 'react-i18next';
import { Command } from '@/stores/commandsStore';

interface CommandItemProps {
  command: Command;
  onEdit: (command: Command) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onExecute?: (command: Command) => void;
}

export const CommandItem: React.FC<CommandItemProps> = ({
  command,
  onEdit,
  onDelete,
  onToggleFavorite,
  onExecute,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-base-200 group transition-colors">
      <button
        className={`btn btn-ghost btn-xs p-1 ${command.isFavorite ? 'text-warning' : 'opacity-50 hover:opacity-100'}`}
        onClick={() => onToggleFavorite(command.id)}
        title={command.isFavorite ? t('commands.unfavorite') : t('commands.favorite')}
      >
        <svg
          className="w-4 h-4"
          fill={command.isFavorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {command.name}
          </span>
        </div>
        {command.description && (
          <p className="text-xs text-base-content/60 truncate">{command.description}</p>
        )}
      </div>

      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
        {onExecute && (
          <button
            className="btn btn-ghost btn-xs p-1 text-success"
            onClick={() => onExecute(command)}
            title={t('commands.execute')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
        <button
          className="btn btn-ghost btn-xs p-1"
          onClick={() => onEdit(command)}
          title={t('commands.edit')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          className="btn btn-ghost btn-xs p-1 text-error"
          onClick={() => onDelete(command.id)}
          title={t('commands.delete')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

