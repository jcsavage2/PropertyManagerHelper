import axios from 'axios';
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { renderToastError, toggleBodyScroll } from '@/utils';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useDevice } from '@/hooks/use-window-size';
import { LoadingSpinner } from './loading-spinner/loading-spinner';
import { useUserContext } from '@/context/user';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { USER_TYPE } from '@/database/entities/user';
import { USER_PERMISSION_ERROR } from '@/constants';
import { CreateComment } from '@/types';
import { CreateCommentSchema } from '@/types/customschemas';

export type AddCommentModalProps = {
  addCommentModalIsOpen: boolean;
  workOrderId: string;
  setAddCommentModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onSuccessfulAdd: () => void;
};

export const AddCommentModal = ({ addCommentModalIsOpen, workOrderId, setAddCommentModalIsOpen, onSuccessfulAdd }: AddCommentModalProps) => {
  const { user } = useSessionUser();
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);
  const { isMobile } = useDevice();
  const { userType, altName } = useUserContext();
  isBrowser && Modal.setAppElement('#work-order');

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
    reset();
    setAddCommentModalIsOpen(false);
  }

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isValid, errors },
    reset,
  } = useForm<CreateComment>({ resolver: zodResolver(CreateCommentSchema), mode: 'all' });

  const handleCreateNewComment: SubmitHandler<CreateComment> = useCallback(
    async (params) => {
      try {
        if (userType === USER_TYPE.TENANT) {
          throw new Error(USER_PERMISSION_ERROR);
        }
        const res = await axios.post('/api/create-comment', params);

        const parsedResponse = JSON.parse(res.data.response);
        if (parsedResponse.modified) {
          toast.success('Comment Successfully Added', {
            position: toast.POSITION.TOP_CENTER,
            draggable: false,
          });
          onSuccessfulAdd();
        }
        closeModal();
      } catch (err) {
        console.log({ err });
        renderToastError(err, 'Error creating comment');
      }
    },
    [userType]
  );

  return (
    <Modal isOpen={addCommentModalIsOpen} onAfterOpen={() => toggleBodyScroll(true)} onRequestClose={closeModal} contentLabel="Add Comment Modal" style={customStyles}>
      <div className="w-full text-right">
        <button className="bg-blue-200 h-6 w-6 text-center text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" onClick={closeModal}>
          X
        </button>
      </div>

      <form onSubmit={handleSubmit(handleCreateNewComment)} style={{ display: 'grid' }}>
        <div className="label">
          <span className="label-text">What would you like to say?</span>
        </div>
        <input
          className="input input-sm input-bordered"
          id="comment"
          placeholder={"Ex. 'Toilet was leaking from tank, not bowl'"}
          type={'text'}
          {...register('comment', {
            required: true,
          })}
        />
        {errors.comment && <p className="text-red-500 text-xs mt-1 italic">{errors.comment.message}</p>}
        <input type="hidden" {...register('workOrderId')} value={workOrderId} />
        <input type="hidden" {...register('email')} value={user?.email ?? ''} />
        <input type="hidden" {...register('name')} value={altName ?? user?.name ?? ''} />
        <button className="btn bg-blue-200 hover:bg-blue-300 mt-2" type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting ? <LoadingSpinner /> : 'Add Comment'}
        </button>
      </form>
    </Modal>
  );
};
