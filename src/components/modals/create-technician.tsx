import { useUserContext } from '@/context/user';
import axios from 'axios';
import { useCallback } from 'react';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import {  renderToastError, renderToastSuccess } from '@/utils';
import { USER_TYPE } from '@/database/entities/user';
import { USER_PERMISSION_ERROR } from '@/constants';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTechnician } from '@/types';
import { CreateTechnicianSchema } from '@/types/customschemas';
import { LoadingSpinner } from '../loading-spinner';
import Modal from '../modal';
import { useDocument } from '@/hooks/use-document';

const modalId = 'create-technician-modal';

export type CreateTechnicianModalProps = {
  onSuccessfulAdd: () => void;
};

export const CreateTechnicianModal = ({ onSuccessfulAdd }: CreateTechnicianModalProps) => {
  const { user } = useSessionUser();
  const { userType, altName } = useUserContext();
  const {clientDocument} = useDocument();

  function closeModal() {
    (clientDocument?.getElementById(modalId) as HTMLFormElement)?.close();
    reset();
  }

  const handleCreateNewTechnician: SubmitHandler<CreateTechnician> = useCallback(
    async (params) => {
      try {
        if (!user?.roles?.includes(USER_TYPE.PROPERTY_MANAGER) || userType !== USER_TYPE.PROPERTY_MANAGER) {
          throw new Error(USER_PERMISSION_ERROR);
        }

        const res = await axios.post('/api/create-technician', params);

        const parsedUser = JSON.parse(res.data.response);
        if (parsedUser.modified) {
          renderToastSuccess('Technician Created!', modalId);
          onSuccessfulAdd();
          closeModal();
        }
      } catch (err) {
        console.log({ err });
        renderToastError(err, 'Error Creating Technician', modalId);
      }
    },
    [user, userType]
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    reset,
  } = useForm<CreateTechnician>({ resolver: zodResolver(CreateTechnicianSchema), mode: 'all' });

  return (
    <Modal
      id={modalId}
      openButtonText="Create Technician"
      title="Create Technician"
      onClose={closeModal}
    >
      <form onSubmit={handleSubmit(handleCreateNewTechnician)} style={{ display: 'grid' }}>
        <input
          className="input input-sm input-bordered mt-3"
          id="name"
          placeholder="Technician Full Name*"
          type={'text'}
          {...register('technicianName', {
            required: true,
          })}
        />
        {errors.technicianName && <p className="text-error text-xs">{errors.technicianName.message}</p>}
        <input
          className="input input-sm input-bordered mt-3"
          id="email"
          placeholder="Technician Email*"
          type="email"
          {...register('technicianEmail', {
            required: true,
          })}
        />
        {errors.technicianEmail && <p className="text-error text-xs">{errors.technicianEmail.message}</p>}
        <input type="hidden" {...register('pmEmail')} value={user?.email ?? ''} />
        <input type="hidden" {...register('pmName')} value={altName ?? user?.name ?? ''} />
        <input type="hidden" {...register('organization')} value={user?.organization ?? ''} />
        <input type="hidden" {...register('organizationName')} value={user?.organizationName ?? ''} />
        <button className="mt-3 btn btn-primary" type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting ? <LoadingSpinner /> : 'Create Technician'}
        </button>
      </form>
    </Modal>
  );
};
