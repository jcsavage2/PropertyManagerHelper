import { useUserContext } from '@/context/user';
import axios from 'axios';
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { toggleBodyScroll } from '@/utils';
import { useDevice } from '@/hooks/use-window-size';
import { userRoles } from '@/database/entities/user';
import { API_STATUS, EMAIL_MATCHING_ERROR, USER_PERMISSION_ERROR } from '@/constants';
import { SubmitHandler, useForm } from 'react-hook-form';
import { lowerCaseRequiredEmail, lowerCaseRequiredString } from '@/types/zodvalidators';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

export type AddTechnicianModalProps = {
  technicianModalIsOpen: boolean;
  setTechnicianModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onSuccessfulAdd: () => void;
};

export const CreateTechnicianSchema = z.object({
  technicianEmail: lowerCaseRequiredEmail,
  technicianName: lowerCaseRequiredString,
  pmEmail: lowerCaseRequiredEmail,
  pmName: lowerCaseRequiredString,
  organization: z.string().min(1),
  organizationName: z.string().min(1),
});
export type CreateTechnicianSchemaType = z.infer<typeof CreateTechnicianSchema>;

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
      width: isMobile ? '75%' : '50%',
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

  const [isBrowser, setIsBrowser] = useState(false);
  isBrowser && Modal.setAppElement('#technicians');
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  function closeModal() {
    reset()
    setTechnicianModalIsOpen(false);
  }

  const handleCreateNewTechnician: SubmitHandler<CreateTechnicianSchemaType> = useCallback(
    async (params) => {
      try {
        if (!user?.roles?.includes(userRoles.PROPERTY_MANAGER) || userType !== userRoles.PROPERTY_MANAGER) {
          throw new Error(USER_PERMISSION_ERROR);
        }

        if(user?.email === params.technicianEmail){
          setError('technicianEmail', { message: EMAIL_MATCHING_ERROR })
          return
        }

        const res = await axios.post('/api/create-technician', params)
        if (res.status !== API_STATUS.SUCCESS) throw new Error(res.data.response);
        
        const parsedUser = JSON.parse(res.data.response);
        if (parsedUser.modified) {
          toast.success('Technician Created!', { position: toast.POSITION.TOP_CENTER, draggable: false });
          onSuccessfulAdd();
          closeModal()
        }
      } catch (err) {
        toast.error('Error creating technician', { position: toast.POSITION.TOP_CENTER, draggable: false });
        console.log({ err });
      }
    },
    [user, userType]
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setError,
    reset,
  } = useForm<CreateTechnicianSchemaType>({ resolver: zodResolver(CreateTechnicianSchema)});

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
        <button className="bg-blue-200 px-2 py-1 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" onClick={closeModal}>
          X Close
        </button>
      </div>

      <form onSubmit={handleSubmit(handleCreateNewTechnician)} style={{ display: 'grid' }}>
        <input
          className="rounded px-1 border-solid border-2 border-slate-200 mt-5"
          id="name"
          placeholder="Technician Full Name*"
          type={'text'}
          {...register('technicianName')}
        />
        {errors.technicianName && <p className="text-red-500 text-xs">{errors.technicianName.message}</p>}
        <input
          className="rounded px-1 border-solid border-2 border-slate-200 mt-5"
          id="email"
          placeholder="Technician Email*"
          type="email"
          {...register('technicianEmail')}
        />
        {errors.technicianEmail && <p className="text-red-500 text-xs">{errors.technicianEmail.message}</p>}
        <input type="hidden" {...register('pmEmail')} value={user?.email ?? ''} />
        <input type="hidden" {...register('pmName')} value={altName ?? user?.name ?? ''} />
        <input type="hidden" {...register('organization')} value={user?.organization ?? ''} />
        <input type="hidden" {...register('organizationName')} value={user?.organizationName ?? ''} />
        <button className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" type="submit" disabled={isSubmitting || !isValid}>
          Add Technician
        </button>
      </form>
    </Modal>
  );
};
