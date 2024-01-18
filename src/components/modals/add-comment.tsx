import axios from 'axios';
import { useCallback } from 'react';
import { renderToastError, renderToastSuccess } from '@/utils';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { LoadingSpinner } from '../loading-spinner';
import { useUserContext } from '@/context/user';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { USER_TYPE } from '@/database/entities/user';
import { USER_PERMISSION_ERROR } from '@/constants';
import { CreateComment } from '@/types';
import { CreateCommentSchema } from '@/types/customschemas';
import Modal from '../modal';
import { useDocument } from '@/hooks/use-document';

const modalId = 'add-comment-modal';

export type AddCommentModalProps = {
  workOrderId: string;
  onSuccessfulAdd: () => void;
};

export const AddCommentModal = ({ workOrderId, onSuccessfulAdd }: AddCommentModalProps) => {
  const { user } = useSessionUser();
  const { userType, altName } = useUserContext();
  const {clientDocument} = useDocument();

  function closeModal() {
    (clientDocument?.getElementById(modalId) as HTMLFormElement)?.close();
    reset();
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
          renderToastSuccess('Comment Successfully Added', modalId);
          onSuccessfulAdd();
        }
        closeModal();
      } catch (err) {
        console.log({ err });
        renderToastError(err, 'Error creating comment', modalId);
      }
    },
    [userType]
  );

  return (
    <Modal id={modalId} onClose={closeModal} openButtonText="Add Comment" buttonClasses="btn-sm ml-2 text-xs">
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
        {errors.comment && <p className="text-error text-xs mt-1 italic">{errors.comment.message}</p>}
        <input type="hidden" {...register('workOrderId')} value={workOrderId} />
        <input type="hidden" {...register('email')} value={user?.email ?? ''} />
        <input type="hidden" {...register('name')} value={altName ?? user?.name ?? ''} />
        <button className="btn btn-primary mt-2" type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting ? <LoadingSpinner /> : 'Add Comment'}
        </button>
      </form>
    </Modal>
  );
};
