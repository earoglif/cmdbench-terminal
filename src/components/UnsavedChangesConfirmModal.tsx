import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface UnsavedChangesConfirmModalProps {
  isOpen: boolean;
  onDiscard: () => void;
  onCancel: () => void;
}

export const UnsavedChangesConfirmModal: React.FC<UnsavedChangesConfirmModalProps> = ({
  isOpen,
  onDiscard,
  onCancel,
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (!isOpen && dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [isOpen]);

  const handleCancel = () => {
    onCancel();
  };

  const handleDiscard = () => {
    onDiscard();
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        handleCancel();
      }}
    >
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">{t('unsavedChanges.title')}</h3>
        <p className="py-2">{t('unsavedChanges.message')}</p>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={handleCancel}>
            {t('unsavedChanges.stay')}
          </button>
          <button className="btn btn-error" onClick={handleDiscard}>
            {t('unsavedChanges.discard')}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={(event) => {
        event.preventDefault();
        handleCancel();
      }}>
        <button type="button">close</button>
      </form>
    </dialog>
  );
};
