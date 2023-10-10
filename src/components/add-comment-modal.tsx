import axios from 'axios';
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { toggleBodyScroll } from '@/utils';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useDevice } from '@/hooks/use-window-size';
import { LoadingSpinner } from './loading-spinner/loading-spinner';
import { useUserContext } from '@/context/user';
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userRoles } from '@/database/entities/user';
import { z } from 'zod';
import { ENTITY_KEY } from '@/database/entities';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { lowerCaseRequiredEmail, lowerCaseRequiredString } from '@/types/zodvalidators';

export type AddCommentModalProps = {
  addCommentModalIsOpen: boolean;
  workOrderId: string;
  setAddCommentModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onSuccessfulAdd: () => void;
};

export const CreateCommentSchema = z.object({
  comment: lowerCaseRequiredString,
  email: lowerCaseRequiredEmail,
  name: lowerCaseRequiredString,
  workOrderId: z.string().startsWith(ENTITY_KEY.WORK_ORDER),
})
export type CreateCommentSchemaType = z.infer<typeof CreateCommentSchema>

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
    reset()
    setAddCommentModalIsOpen(false);
  }

  const { register, handleSubmit, formState: { isSubmitting, isValid }, reset } = useForm<CreateCommentSchemaType>({ resolver: zodResolver(CreateCommentSchema) });

  const handleCreateNewComment: SubmitHandler<CreateCommentSchemaType> = useCallback(
    async (params) => {
      try {
        if(userType === userRoles.TENANT){
          throw new Error(USER_PERMISSION_ERROR);
        }
        const res = await axios.post('/api/create-comment', params)
        if (res.status !== API_STATUS.SUCCESS) throw new Error(res.data.response);
        
        const parsedResponse = JSON.parse(res.data.response);
        if (parsedResponse.modified) {
          toast.success('Comment Successfully Added', { position: toast.POSITION.TOP_CENTER, draggable: false });
          onSuccessfulAdd();
          setAddCommentModalIsOpen(false);
        }
        reset();
      } catch (err) {
        console.log({ err });
        toast.error('Error adding comment',  { position: toast.POSITION.TOP_CENTER, draggable: false });
      }
    },
    [userType]
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

      <form onSubmit={handleSubmit(handleCreateNewComment)} style={{ display: 'grid' }}>
        <label htmlFor="comment" className="mb-1">What would you like to say?* </label>
        <input
          className="rounded px-1 border-solid border-2 border-slate-200"
          id="comment"
          placeholder={"Ex. 'Toilet was leaking from tank, not bowl'"}
          type={'text'}
          {...register('comment')}
        />
        <input type="hidden" {...register('workOrderId')} value={workOrderId} />
        <input type="hidden" {...register('email')} value={user?.email ?? ''} />
        <input type="hidden" {...register('name')} value={altName ?? user?.name ?? ''} />
        <button className="bg-blue-200 p-3 mt-4 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting ? <LoadingSpinner /> : "Add Comment"}
        </button>
      </form>
    </Modal>
  );
};
