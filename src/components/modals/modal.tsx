import { useDocument } from '@/hooks/use-document';
import React, { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';

type ModalProps = {
  id: string;
  onClose?: () => void;
  onOpen?: () => void;
  openButtonText?: string;
  title?: string;
  children: React.ReactNode;
  bodyClasses?: string;
  buttonClasses?: string;
  closeButtonClasses?: string;
  overflowVisible?: boolean;

  //Optionally, modal open/closed state can be controlled by the parent component
  isOpen?: boolean;
};

const Modal = ({ id, onOpen, onClose, openButtonText, title, children, bodyClasses, buttonClasses, closeButtonClasses, isOpen, overflowVisible = true }: ModalProps) => {

  const {clientDocument} = useDocument();

  useEffect(() => {
    const self = clientDocument?.getElementById(id) as HTMLFormElement;
    if (!self) return;
    
    if (isOpen) {
      self.showModal();
    } else {
      onClose && onClose();
      self.close();
    }
  }, [isOpen]);

  return (
    <>
      {openButtonText ? (
        <button
          className={`btn btn-primary ${buttonClasses ? buttonClasses : ''}`}
          onClick={() => {
            (clientDocument?.getElementById(id) as HTMLFormElement).showModal();
            onOpen && onOpen();
          }}
        >
          {openButtonText}
        </button>
      ) : null}

      <dialog id={id} className={`modal z-10 ${overflowVisible && 'overflow-visible'}`}>
        <div className={`modal-box ${overflowVisible && 'overflow-visible'} ${bodyClasses ? bodyClasses : ''}`}>
          <form method="dialog" className="flex flex-row justify-center">
            {title ? <h3 className="font-bold text-lg">{title}</h3> : null}
            <button className={`btn z-20 btn-sm btn-circle btn-ghost absolute right-2 top-2 ${closeButtonClasses}`} onClick={onClose}>
              ✕
            </button>
          </form>

          {children}
        </div>
        {/* So toast notifications aren't hidden behind dialogs */}
        <ToastContainer 
          containerId={id}
          enableMultiContainer
        />
        {/* Modal closes when the user clicks outside of it */}
        <form method="dialog" className="modal-backdrop">
          <button
            onClick={() => {
              onClose && onClose();
            }}
          >
            close
          </button>
        </form>
      </dialog>
    </>
  );
};

export default Modal;
