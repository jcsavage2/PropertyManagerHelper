import { useDevice } from '@/hooks/use-window-size';
import { toggleBodyScroll } from '@/utils';
import { Dispatch, SetStateAction } from 'react';
import Modal from 'react-modal';

export const ConfirmationModal = ({
  confirmationModalIsOpen,
  setConfirmationModalIsOpen,
  onConfirm,
  childrenComponents,
  onCancel,
  buttonsDisabled,
  fetchAllTenants,
}: {
  confirmationModalIsOpen: boolean;
  setConfirmationModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onConfirm: () => void;
  childrenComponents: React.ReactNode;
  onCancel?: () => void;
  buttonsDisabled?: boolean;
  fetchAllTenants?: () => void;
}) => {
  const { isMobile } = useDevice();

  function closeModal() {
    setConfirmationModalIsOpen(false);
  }

  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      transform: 'translate(-50%, -50%)',
      width: isMobile ? '80%' : '40%',
      backgroundColor: 'rgba(255, 255, 255)',
    },
    overLay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(25, 255, 255, 0.75)',
    },
  };

  return (
    <Modal
      isOpen={confirmationModalIsOpen}
      onAfterOpen={() => {
        fetchAllTenants && fetchAllTenants();
        toggleBodyScroll(true);
      }}
      onAfterClose={() => toggleBodyScroll(false)}
      onRequestClose={closeModal}
      contentLabel="Example Modal"
      closeTimeoutMS={0}
      style={customStyles}
    >
      <div className="w-full h-full">{childrenComponents}</div>
      <div className="flex flex-row md:w-1/2 w-3/4 mx-auto justify-between mt-6">
        <button
          className="w-20 bg-blue-200 rounded py-1 hover:bg-blue-300 disabled:opacity-50"
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
          className="w-20 bg-blue-200 rounded py-1 hover:bg-blue-300 disabled:opacity-50"
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
