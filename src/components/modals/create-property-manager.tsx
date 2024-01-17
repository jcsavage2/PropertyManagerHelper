import axios from 'axios';
import { useCallback } from 'react';
import { LoadingSpinner } from '../loading-spinner';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';
import { USER_TYPE } from '@/database/entities/user';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useForm } from 'react-hook-form';
import { renderToastError, renderToastSuccess } from '@/utils';
import { CreatePMSchema } from '@/types/customschemas';
import { USER_PERMISSION_ERROR } from '@/constants';
import { CreatePMSchemaType } from '@/types';
import Modal from '../modal';

const modalId = 'create-pm-modal';

export const CreatePropertyManagerModal = ({
  onSuccessfulAdd,
}: {
  onSuccessfulAdd: () => void;
}) => {
  const { user } = useSessionUser();
  const { userType } = useUserContext();

  function closeModal() {
    (document.getElementById(modalId) as HTMLFormElement)?.close();
    reset();
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    reset,
  } = useForm<CreatePMSchemaType>({ resolver: zodResolver(CreatePMSchema), mode: 'all' });

  const handleCreatePM: SubmitHandler<CreatePMSchemaType> = useCallback(
    async (params) => {
      try {
        if (userType !== USER_TYPE.PROPERTY_MANAGER || !user?.isAdmin || !user?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
          throw new Error(USER_PERMISSION_ERROR);
        }

        const res = await axios.post('api/create-pm', params);

        renderToastSuccess('Successfully Created PM!', modalId);
        onSuccessfulAdd();
        closeModal();
      } catch (err: any) {
        console.log({ err });
        renderToastError(err, 'Error Creating PM', modalId);
      }
    },
    [user, userType]
  );

  return (
    <Modal id={modalId} onClose={closeModal} openButtonText='+ Property Manager'>
      <form onSubmit={handleSubmit(handleCreatePM)} className="flex flex-col mt-6">
        <input
          className="input input-sm input-bordered"
          id="name"
          placeholder="Full Name*"
          type={'text'}
          {...register('userName', {
            required: true,
          })}
        />
        {errors.userName && <p className="text-error text-xs mt-1 italic">{errors.userName.message}</p>}
        <input
          className="input input-sm input-bordered mt-3"
          id="email"
          placeholder="Email*"
          type="email"
          {...register('userEmail', {
            required: true,
          })}
        />
        {errors.userEmail && <p className="text-error text-xs mt-1 italic">{errors.userEmail.message}</p>}
        <div className="flex flex-row items-center justify-center mt-2">
          <label className="label cursor-pointer">
            <span className="label-text">Is admin?</span>
            <input
              className="checkbox ml-3"
              id="isAdmin"
              type="checkbox"
              {...register('isAdmin', {
                required: true,
              })}
            />
          </label>
        </div>
        <input type="hidden" {...register('organization')} value={user?.organization ?? ''} />
        <input type="hidden" {...register('organizationName')} value={user?.organizationName ?? ''} />
        <input type="hidden" {...register('organizationName')} value={user?.organizationName ?? ''} />

        <button className="btn btn-primary mt-4" type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting ? <LoadingSpinner containerClass="h-10" /> : 'Create Property Manager'}
        </button>
      </form>
    </Modal>
  );
};
