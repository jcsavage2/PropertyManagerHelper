import axios from 'axios';
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { LoadingSpinner } from './loading-spinner/loading-spinner';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';
import { ICreatePMUser, userRoles } from '@/database/entities/user';
import { useDevice } from '@/hooks/use-window-size';

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
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);

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

  isBrowser && Modal.setAppElement('#property-managers');

  const [pmEmail, setPMEmail] = useState<string>('');
  const [pmName, setPMName] = useState<string>('');
  const [createPMLoading, setCreatePMLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  function closeModal() {
    setAddPMModalIsOpen(false);
  }

  const handleCreatePM: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      try {
        event.preventDefault();
        if (!user || !user?.email || !user?.name) throw new Error('user must be logged in');
        if (userType !== 'PROPERTY_MANAGER' || !user?.roles?.includes(userRoles.PROPERTY_MANAGER) || !user.organization || !user.organizationName)
          throw new Error('user must be a property manager in an organization');
        if (!pmEmail || !pmName) {
          throw new Error('Missing params pmEmail or pmName');
        }
        if (!userType) {
          throw new Error('No userType');
        }
        if (!user.isAdmin) {
          throw new Error("User must be an admin to create pms");
        }
        setCreatePMLoading(true);

        const body: ICreatePMUser = {
          userEmail: pmEmail,
          userName: pmName,
          organization: user.organization,
          organizationName: user.organizationName,
          isAdmin,
        };

        const res = await axios.post('/api/create-pm', body);
        if (res.status !== 200) throw new Error('Error creating pm');

        toast.success('Successfully Created PM!', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
        onSuccessfulAdd();
        setPMEmail('');
        setPMName('');
      } catch (err) {
        console.log({ err });
        toast.error((err as any)?.response?.data?.response ?? 'Error Creating PM. Please Try Again', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
      }
      setAddPMModalIsOpen(false);
      setCreatePMLoading(false);
    },
    [user, onSuccessfulAdd, setAddPMModalIsOpen, pmEmail, pmName, isAdmin]
  );

  const handlePmEmailChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setPMEmail(e.currentTarget.value);
    },
    [setPMEmail]
  );
  const handlePmNameChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setPMName(e.currentTarget.value);
    },
    [setPMName]
  );

  return (
    <Modal
      isOpen={addPMModalIsOpen}
      onAfterOpen={() => { }}
      onRequestClose={closeModal}
      contentLabel="Create PM Modal"
      closeTimeoutMS={200}
      style={customStyles}
    >
      <div className="w-full text-center mb-2 h-6">
        <button className="float-right bg-blue-200 px-2 py-1 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" onClick={closeModal}>
          X
        </button>
        <p className="clear-left text-lg md:w-2/5 w-3/5 mx-auto pt-0.5">{isMobile ? 'Create PM' : 'Create New Property Manager'}</p>
      </div>

      <form onSubmit={handleCreatePM} className="flex flex-col">
        <input
          className="rounded px-1 border-solid border-2 border-slate-200 mt-5"
          id="name"
          placeholder="Full Name*"
          type={'text'}
          value={pmName}
          onChange={handlePmNameChange}
        />
        <input
          className="rounded px-1 border-solid border-2 border-slate-200 mt-5"
          id="email"
          placeholder="Email*"
          type="email"
          value={pmEmail}
          onChange={handlePmEmailChange}
        />
        <div className="flex flex-row items-center justify-center h-4 mt-5">
          <label htmlFor="isAdmin" className=" mr-2">
            Is admin?
          </label>
          <input
            className="rounded px-1 border-solid border-2 w-4 h-4 border-slate-200"
            id="isAdmin"
            placeholder="Email*"
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => { setIsAdmin(!isAdmin); }}
          />
        </div>

        <button
          className="bg-blue-200 p-3 mt-4 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          type="submit"
          disabled={!pmName || !pmEmail || createPMLoading}
        >
          {createPMLoading ? <LoadingSpinner containerClass='h-10' /> : 'Create Property Manager'}
        </button>
      </form>
    </Modal>
  );
};
