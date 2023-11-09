import axios from 'axios';
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { LoadingSpinner } from './loading-spinner/loading-spinner';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';
import { USER_TYPE } from '@/database/entities/user';
import { useDevice } from '@/hooks/use-window-size';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useForm } from 'react-hook-form';
import { renderToastError, toggleBodyScroll } from '@/utils';
import { CreatePMSchema } from '@/types/customschemas';
import { USER_PERMISSION_ERROR } from '@/constants';
import { CreatePMSchemaType } from '@/types';

export const AddPropertyManagerModal = ({
  addPMModalIsOpen,
  setAddPMModalIsOpen,
  onSuccessfulAdd,
}: {
  addPMModalIsOpen: boolean;
  setAddPMModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onSuccessfulAdd: () => void;
}) => {
  const { user } = useSessionUser();
  const { userType } = useUserContext();
  const { isMobile } = useDevice();

  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      transform: 'translate(-50%, -50%)',
      width: isMobile ? '90%' : '60%',
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
  useEffect(() => {
    setIsBrowser(true);
  }, []);
  isBrowser && Modal.setAppElement('#property-managers');

  function closeModal() {
    reset();
    setAddPMModalIsOpen(false);
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
        if (
          userType !== USER_TYPE.PROPERTY_MANAGER ||
          !user?.isAdmin ||
          !user?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)
        ) {
          throw new Error(USER_PERMISSION_ERROR);
        }

        const res = await axios.post('api/create-pm', params);

        toast.success('Successfully Created PM!', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
        onSuccessfulAdd();
        closeModal();
      } catch (err: any) {
        console.log({ err });
        renderToastError(err, 'Error Creating PM');
      }
    },
    [user, userType]
  );

  return (
    <Modal
      isOpen={addPMModalIsOpen}
      onAfterOpen={() => toggleBodyScroll(true)}
      onAfterClose={() => toggleBodyScroll(false)}
      onRequestClose={closeModal}
      contentLabel="Create PM Modal"
      closeTimeoutMS={200}
      style={customStyles}
    >
      <div className="w-full text-center mb-2 h-6">
        <button
          className="float-right bg-blue-200 px-2 py-1 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          onClick={closeModal}
        >
          X
        </button>
        <p className="clear-left text-lg md:w-2/5 w-3/5 mx-auto pt-0.5">
          {isMobile ? 'Create PM' : 'Create New Property Manager'}
        </p>
      </div>

      <form onSubmit={handleSubmit(handleCreatePM)} className="flex flex-col">
        <input
          className="rounded px-1 border-solid border-2 border-slate-200 mt-5"
          id="name"
          placeholder="Full Name*"
          type={'text'}
          {...register('userName', {
            required: true,
          })}
        />
        {errors.userName && (
          <p className="text-red-500 text-xs mt-1 italic">{errors.userName.message}</p>
        )}
        <input
          className="rounded px-1 border-solid border-2 border-slate-200 mt-5"
          id="email"
          placeholder="Email*"
          type="email"
          {...register('userEmail', {
            required: true,
          })}
        />
        {errors.userEmail && (
          <p className="text-red-500 text-xs mt-1 italic">{errors.userEmail.message}</p>
        )}
        <div className="flex flex-row items-center justify-center h-4 mt-5">
          <label htmlFor="isAdmin" className=" mr-2">
            Is admin?
          </label>
          <input
            className="rounded px-1 border-solid border-2 w-4 h-4 border-slate-200"
            id="isAdmin"
            type="checkbox"
            {...register('isAdmin', {
              required: true,
            })}
          />
        </div>
        <input type="hidden" {...register('organization')} value={user?.organization ?? ''} />
        <input
          type="hidden"
          {...register('organizationName')}
          value={user?.organizationName ?? ''}
        />

        <button
          className="bg-blue-200 p-3 mt-4 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          type="submit"
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? <LoadingSpinner containerClass="h-10" /> : 'Create Property Manager'}
        </button>
      </form>
    </Modal>
  );
};
