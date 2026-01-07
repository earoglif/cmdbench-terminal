import React from 'react';
import { useTranslation } from 'react-i18next';
import { Command } from '@/stores/commandsStore';
import { AiFillStar, AiOutlineStar } from 'react-icons/ai';
import { FiPlay, FiEdit, FiTrash2 } from 'react-icons/fi';

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
        {command.isFavorite ? (
          <AiFillStar className="w-4 h-4" />
        ) : (
          <AiOutlineStar className="w-4 h-4" />
        )}
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
            <FiPlay className="w-4 h-4" />
          </button>
        )}
        <button
          className="btn btn-ghost btn-xs p-1"
          onClick={() => onEdit(command)}
          title={t('commands.edit')}
        >
          <FiEdit className="w-4 h-4" />
        </button>
        <button
          className="btn btn-ghost btn-xs p-1 text-error"
          onClick={() => onDelete(command.id)}
          title={t('commands.delete')}
        >
          <FiTrash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

