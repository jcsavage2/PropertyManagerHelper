import { useUserContext } from '@/context/user';
import axios from 'axios';
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { renderToastError, toggleBodyScroll } from '@/utils';
import { useDevice } from '@/hooks/use-window-size';
import { USER_TYPE } from '@/database/entities/user';
import { USER_PERMISSION_ERROR } from '@/constants';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTechnician } from '@/types';
import { CreateTechnicianSchema } from '@/types/customschemas';
import { LoadingSpinner } from './loading-spinner/loading-spinner';

export type AddTechnicianModalProps = {
  technicianModalIsOpen: boolean;
  setTechnicianModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onSuccessfulAdd: () => void;
};

export const AddTechnicianModal = ({ technicianModalIsOpen, setTechnicianModalIsOpen, onSuccessfulAdd }: AddTechnicianModalProps) => {
  const { user } = useSessionUser();
  const { isMobile } = useDevice();
  const { userType, altName } = useUserContext();

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
    },
  };

  const [isBrowser, setIsBrowser] = useState(false);
  isBrowser && Modal.setAppElement('#technicians');
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  function closeModal() {
    reset();
    setTechnicianModalIsOpen(false);
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
          toast.success('Technician Created!', {
            position: toast.POSITION.TOP_CENTER,
            draggable: false,
          });
          onSuccessfulAdd();
          closeModal();
        }
      } catch (err) {
        console.log({ err });
        renderToastError(err, 'Error Creating Technician');
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
      isOpen={technicianModalIsOpen}
      onAfterOpen={() => toggleBodyScroll(true)}
      onAfterClose={() => toggleBodyScroll(false)}
      onRequestClose={closeModal}
      contentLabel="Add New Technician Modal"
      style={customStyles}
    >
      <div className="w-full text-right">
        <button className="btn btn-sm btn-secondary" onClick={closeModal}>
          X
        </button>
      </div>

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
