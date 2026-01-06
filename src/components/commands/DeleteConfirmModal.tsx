import React from 'react';
import { useTranslation } from 'react-i18next';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        <p className="py-2">{message}</p>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            {t('commandGroups.cancel')}
          </button>
          <button
            className="btn btn-error"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {t('commandGroups.delete')}
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </div>
  );
};

