import { Dispatch, SetStateAction } from 'react';
import Modal from './modal';
import { useDocument } from '@/hooks/use-document';

const modalIdPrefix = 'confirmation-modal';

export const ConfirmationModal = ({
  id,
  openButtonText,
  confirmationModalIsOpen,
  setConfirmationModalIsOpen,
  onConfirm,
  childrenComponents,
  onCancel,
  buttonsDisabled,
}: {
  id: string;
  openButtonText?: string;
  confirmationModalIsOpen: boolean;
  setConfirmationModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onConfirm: () => void;
  childrenComponents: React.ReactNode;
  onCancel?: () => void;
  buttonsDisabled?: boolean;
}) => {
  const modalId = `${modalIdPrefix}-${id}`;
  const {clientDocument} = useDocument();

  function closeModal() {
    (clientDocument?.getElementById(modalId) as HTMLFormElement)?.close();
    setConfirmationModalIsOpen(false);
  }

  return (
    <Modal
      id={modalId}
      openButtonText={openButtonText}
      isOpen={confirmationModalIsOpen}
      onClose={closeModal}
    >
      <div className="w-full h-full mt-4">{childrenComponents}</div>
      <div className="flex flex-row md:w-1/2 w-3/4 mx-auto justify-between mt-6">
        <button
          className="w-20 btn btn-sm btn-secondary"
          disabled={buttonsDisabled ?? false}
          onClick={() => {
            if (buttonsDisabled) return;
            onConfirm();
          }}
        >
          Yes
        </button>
        <button
          disabled={buttonsDisabled ?? false}
          className="w-20 btn btn-sm btn-secondary"
          onClick={() => {
            if (buttonsDisabled) return;
            closeModal();
            if (onCancel) onCancel();
          }}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
