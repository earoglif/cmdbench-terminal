import React, { useRef, useEffect } from 'react';
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (!isOpen && dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [isOpen]);

  const handleCloseModal = () => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
    onClose();
  };

  const handleConfirm = () => {
    onConfirm();
    handleCloseModal();
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onCancel={handleCloseModal}
    >
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        <p className="py-2">{message}</p>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={handleCloseModal}>
            {t('commandGroups.cancel')}
          </button>
          <button
            className="btn btn-error"
            onClick={handleConfirm}
          >
            {t('commandGroups.delete')}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={handleCloseModal}>
        <button type="button">close</button>
      </form>
    </dialog>
  );
};

