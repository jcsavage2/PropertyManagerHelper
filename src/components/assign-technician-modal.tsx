import { useUserContext } from '@/context/user';
import axios from 'axios';
import {
  Dispatch,
  FormEventHandler,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { CreateTechnicianBody } from '@/pages/api/create-technician';
import { ITechnician } from '@/database/entities/technician';
import { AssignTechnicianBody } from '@/pages/api/assign-technician';
import { useDevice } from '@/hooks/use-window-size';
import { IWorkOrder } from '@/database/entities/work-order';
import Select from 'react-select';
import { OptionType } from '@/types';

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: '75%',
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

const mobileStyles = {
  content: {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '75%',
    height: '50%',
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

export type AssignTechnicianModalProps = {
  assignTechnicianModalIsOpen: boolean;
  workOrderId: string;
  setAssignTechnicianModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onSuccessfulAdd: () => void;
};

// when I assign a technician, I need to create a companion row of the work order.
// This companion row will also neet to be updated when status is updated.
// Thus, when updating a status for the work order, we must also update it for each of the technicians.
// This will mean 1 additional write (possibly more if multiple technicians are assigned).

export const AssignTechnicianModal = ({
  assignTechnicianModalIsOpen,
  workOrderId,
  setAssignTechnicianModalIsOpen,
  onSuccessfulAdd,
}: AssignTechnicianModalProps) => {
  const { user } = useUserContext();
  const [isBrowser, setIsBrowser] = useState(false);
  const { isMobile } = useDevice();
  const [workOrder, setWorkOrder] = useState<IWorkOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [technicianOptions, setTechnicianOptions] = useState<OptionType[]>([
    { value: '', label: '' },
  ]);
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  isBrowser && Modal.setAppElement('#work-order');

  const [technicianEmail, setTechnicianEmail] = useState<string>('');
  const [technicians, setTechnicians] = useState<ITechnician[]>([]);

  const getWorkOrder = useCallback(async () => {
    try {
      if (!workOrderId) {
        return;
      }
      const { data } = await axios.post('/api/get-work-order', {
        pk: workOrderId,
        sk: workOrderId,
      });
      if (data.response) {
        const parsed = JSON.parse(data.response);
        setWorkOrder(parsed.Item);
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
    }
  }, [workOrderId]);

  async function getTechnicians() {
    try {
      if (!workOrderId) {
        return;
      }
      const { data } = await axios.post('/api/get-all-technicians-for-pm', {
        propertyManagerEmail: user.pmEmail,
      });
      if (data.response) {
        const parsed = JSON.parse(data.response);
        setTechnicians(parsed);
        setTechnicianOptions([]);
        for (let i = 0; i < parsed.length; i++) {
          setTechnicianOptions((prev) => [
            ...prev,
            {
              value: parsed[i].technicianEmail as string,
              label: parsed[i].technicianEmail as string,
            },
          ]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    getTechnicians();
    getWorkOrder();
  }, [user.pmEmail, assignTechnicianModalIsOpen, getWorkOrder, workOrderId]);

  const handleTechnicianEmailChange: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    (e) => {
      setTechnicianEmail(e.currentTarget.value);
    },
    [setTechnicianEmail]
  );

  const handleAssignNewTechnician: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      try {
        event.preventDefault();
        if (!user.pmEmail) {
          /**
           * TODO: instead of throwing here we should toast.error 
           * or block this UI from being seen if user is not a PM.
           */
          throw new Error('user needs to be a Property Manager.');
        }
        if (technicianEmail === '') {
          return;
        }
        const { data } = await axios.post('/api/assign-technician', {
          technicianEmail: technicianEmail,
          workOrderId,
          address: workOrder?.address,
          status: workOrder?.status,
          issueDescription: workOrder?.issue,
          permissionToEnter: workOrder?.permissionToEnter,
          pmEmail: user.pmEmail,
        } as AssignTechnicianBody);
        toast.success('Technician Assigned to Work Order');

        onSuccessfulAdd();
        if (isMobile) {
          setTechnicianEmail('');
          getWorkOrder();
        } else {
          setAssignTechnicianModalIsOpen(false);
        }
      } catch (err) {
        console.log({ err });
      }
    },
    [
      user,
      onSuccessfulAdd,
      technicianEmail,
      getWorkOrder,
      isMobile,
      workOrderId,
      setAssignTechnicianModalIsOpen
    ]
  );

  const renderAssignedTechnicians = () => {
    if (workOrder && workOrder.assignedTo) {
      return (
        <div className="overflow-scroll flex flex-col text-base h-20 mb-2">
          {/* {Array.from(workOrder.assignedTo).map((email: string, index: number) =>
            index !== Array.from(workOrder.assignedTo).length - 1 ? (
              <span className="px-2 pb-.5" key={email}>
                {email},{' '}
              </span>
            ) : (
              <span className="px-2" key={email}>
                {email}
              </span>
            )
          )} */}
        </div>
      );
    } else {
      return <span className="text-base h-12">No technicians assigned</span>;
    }
  };

  return (
    <Modal
      isOpen={assignTechnicianModalIsOpen}
      onAfterOpen={() => { }}
      onRequestClose={() => setAssignTechnicianModalIsOpen(false)}
      contentLabel="Assign Technician to Work Order Modal"
      style={isMobile ? mobileStyles : customStyles}>
      <button className="w-full text-right" onClick={() => setAssignTechnicianModalIsOpen(false)}>
        X Close
      </button>

      {isMobile ? (
        <div className="text-center">
          <div className="mx-auto text-xl my-auto text-gray-600">Assigned Technicians: </div>
          {renderAssignedTechnicians()}
          <form onSubmit={handleAssignNewTechnician} style={{ display: 'inline-block' }}>
            <Select
              options={technicianOptions}
              onChange={(option) => setTechnicianEmail(option?.label ?? '')}
            />
            <button
              className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-75"
              type="submit"
              disabled={!technicianEmail}>
              Assign New Technician
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={handleAssignNewTechnician} style={{ display: 'grid' }}>
          <label htmlFor="technicianEmail">Technician: *</label>
          <select id="technicianEmail" onChange={handleTechnicianEmailChange}>
            <option value="">Select a technician to assign the work order to</option>
            {technicians &&
              technicians.map((tech: ITechnician, index: number) => {
                return (
                  <option key={index} value={tech.technicianEmail}>
                    {tech.technicianEmail}
                  </option>
                );
              })}
          </select>
          <button
            className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
            type="submit"
            disabled={!technicianEmail}>
            Assign Technician
          </button>
        </form>
      )}
    </Modal>
  );
};
