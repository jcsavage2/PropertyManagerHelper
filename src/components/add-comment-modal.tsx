import axios from 'axios';
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { CreateCommentBody } from '@/pages/api/create-comment';
import { deconstructKey, toggleBodyScroll } from '@/utils';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useDevice } from '@/hooks/use-window-size';
import { LoadingSpinner } from './loading-spinner/loading-spinner';
import { useUserContext } from '@/context/user';

export type AddCommentModalProps = {
  addCommentModalIsOpen: boolean;
  workOrderId: string;
  setAddCommentModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onSuccessfulAdd: () => void;
};

export const AddCommentModal = ({ addCommentModalIsOpen, workOrderId, setAddCommentModalIsOpen, onSuccessfulAdd }: AddCommentModalProps) => {
  const { user } = useSessionUser();
  const [isBrowser, setIsBrowser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);
  const { isMobile } = useDevice();
  const { userType, altName } = useUserContext();
  isBrowser && Modal.setAppElement('#work-order');

  const [comment, setComment] = useState('');

  const handleCommentChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setComment(e.currentTarget.value);
    },
    [setComment]
  );

  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      width: isMobile ? '95%' : '50%',
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

  function closeModal() {
    setComment('');
    setAddCommentModalIsOpen(false);
  }

  const handleCreateNewComment: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      setIsLoading(true);
      try {
        event.preventDefault();
        if(!user || !user.email || !user || !workOrderId){
          throw new Error('User or workOrderId not found');
        }
        if(userType === 'TENANT'){
          throw new Error('Tenants cannot add comments');
        }
        const { data } = await axios.post('/api/create-comment', {
          comment,
          email: user!.email,
          name: altName ?? user!.name,
          workOrderId: deconstructKey(workOrderId),
        } as CreateCommentBody);
        const { response } = data;
        const parsedResponse = JSON.parse(response);
        if (parsedResponse.modified) {
          toast.success('Comment Successfully Added', { draggable: false });
          setComment('');
          onSuccessfulAdd();
          setAddCommentModalIsOpen(false);
        }
      } catch (err) {
        console.log({ err });
        toast.error('Error adding comment', { draggable: false });
      }
      setIsLoading(false);
    },
    [user, onSuccessfulAdd, comment, workOrderId, setAddCommentModalIsOpen, altName]
  );

  return (
    <Modal
      isOpen={addCommentModalIsOpen}
      onAfterOpen={() => toggleBodyScroll(true)}
      onAfterClose={() => toggleBodyScroll(false)}
      onRequestClose={closeModal}
      contentLabel="Add Comment Modal"
      style={customStyles}
    >
      <div className="w-full text-right mb-2">
        <button className="bg-blue-200 h-6 w-6 text-center text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" onClick={closeModal}>
          X
        </button>
      </div>

      <form onSubmit={handleCreateNewComment} style={{ display: 'grid' }}>
        <label htmlFor="comment" className="mb-1">What would you like to say?* </label>
        <input
          className="rounded px-1 border-solid border-2 border-slate-200"
          id="comment"
          placeholder={"Ex. 'Toilet was leaking from tank, not bowl'"}
          type={'text'}
          value={comment}
          onChange={handleCommentChange}
        />
        <button className="bg-blue-200 p-3 mt-4 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" type="submit" disabled={!comment.length || isLoading}>
          {isLoading ? <LoadingSpinner /> : "Add Comment"}
        </button>
      </form>
    </Modal>
  );
};
