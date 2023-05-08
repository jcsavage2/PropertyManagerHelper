import { IEvent } from '@/database/entities/event';
import { IWorkOrder } from '@/database/entities/work-order';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { AssignTechnicianModal } from './assign-technician-modal';
import { useDevice } from '@/hooks/use-window-size';
import { toTitleCase, deconstructKey } from '@/utils';
import { ActionMeta, MultiValue } from 'react-select';
import { useUserContext } from '@/context/user';
import { AddCommentModal } from './add-comment-modal';
import AsyncSelect from 'react-select/async';
import { OptionType } from '@/types';
import { ITechnician } from '@/database/entities/technician';
import { AssignTechnicianBody } from '@/pages/api/assign-technician';
import { GoTasklist } from 'react-icons/go';
import { AiOutlineCheck } from 'react-icons/ai';
import { STATUS } from '@/constants';

const WorkOrder = ({ workOrderId }: { workOrderId: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [workOrder, setWorkOrder] = useState<IWorkOrder | null>(null);
  const [events, setEvents] = useState<Array<IEvent | null>>([]);
  const [technicianOptions, setTechnicianOptions] = useState<OptionType[]>([]);
  const [assignedTechnicians, setAssignedTechnicians] = useState<OptionType[]>([]);
  const [loadingAssignedTechnicians, setLoadingAssignedTechnicians] = useState(true);
  const { user } = useUserContext();

  const [openAssignTechnicianModal, setOpenAssignTechnicianModal] = useState(false);
  const [openAddCommentModal, setOpenAddCommentModal] = useState(false);
  const { isMobile } = useDevice();

  useEffect(() => {
    getWorkOrder();
    getWorkOrderEvents();
    getTechnicians();
  }, []);

  useEffect(() => {
    console.log('Assigned technicians: ', assignedTechnicians);
  }, [assignedTechnicians]);

  useEffect(() => {
    console.log("Updating assigned Technicians")
    setLoadingAssignedTechnicians(true);
    //set assigned technicians name + email using technicianOptions
    setAssignedTechnicians([]);
    if (workOrder && workOrder.assignedTo && technicianOptions.length > 0) {
      Array.from(workOrder.assignedTo).forEach((email: string) => {
        const technician: OptionType | undefined = technicianOptions.find((technician) => technician.value === email);
        if (technician) {
          setAssignedTechnicians((prev) => [...prev, technician]);
        }
      });
    }
    setLoadingAssignedTechnicians(false);
  }, [workOrder, workOrder?.assignedTo, technicianOptions]);

  async function getTechnicians() {
    try {
      if (!workOrderId) {
        return;
      }
      const { data } = await axios.post('/api/get-all-technicians-for-pm', {
        propertyManagerEmail: user.pmEmail,
      });
      if (data.response) {
        const parsed = JSON.parse(data.response) as ITechnician[];
        setTechnicianOptions([]);
        for (let i = 0; i < parsed.length; i++) {
          setTechnicianOptions((prev) => [
            ...prev,
            {
              value: parsed[i].technicianEmail as string,
              label: parsed[i].technicianName as string,
            },
          ]);
        }
        setLoadingAssignedTechnicians(false);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const searchTechnicians = (inputValue: string) =>
    new Promise<OptionType[]>((resolve) => {
      resolve(
        technicianOptions.filter(
          (i) => i.label.toLowerCase().includes(inputValue.toLowerCase()) || i.value.toLowerCase().includes(inputValue.toLowerCase())
        )
      );
    });

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
        const workOrder: IWorkOrder = parsed.Item;
        setWorkOrder(workOrder);
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
    }
  }, [workOrderId]);

  const getWorkOrderEvents = useCallback(async () => {
    try {
      if (!workOrderId) {
        return;
      }
      setIsLoadingEvents(true);
      const { data } = await axios.post('/api/get-work-order-events', { workOrderId });
      if (data.response) {
        const parsed = JSON.parse(data.response);
        setEvents(parsed);
        setIsLoadingEvents(false);
      }
    } catch (err) {
      console.error(err);
    }
  }, [workOrderId]);

  const handleUpdateStatus = async (e: any, status: string) => {
    if (!workOrder) return;
    setIsUpdatingStatus(true);
    const { data } = await axios.post('/api/update-work-order', {
      pk: workOrder.pk,
      sk: workOrder.sk,
      status: status,
      email: deconstructKey(user.pk),
    });
    const updatedWorkOrder = JSON.parse(data.response);
    if (updatedWorkOrder) {
      setWorkOrder(updatedWorkOrder.Attributes);
    }
    await getWorkOrderEvents();
    setIsUpdatingStatus(false);
  };

  const handleAssignTechnician = async (assignedTechnicians: MultiValue<OptionType>, actionMeta: ActionMeta<OptionType>) => {
    console.log({ assignedTechnicians, actionMeta });
    setLoadingAssignedTechnicians(true);
    const actionType = actionMeta.action;
    if (actionType === 'select-option') {
      const selectedTechnician = actionMeta.option as OptionType;
      await axios.post('/api/assign-technician', {
        workOrderId,
        pmEmail: user.pmEmail,
        technicianEmail: selectedTechnician.value,
        technicianName: selectedTechnician.label,
        address: workOrder?.address,
        status: workOrder?.status,
        permissionToEnter: workOrder?.permissionToEnter,
        issueDescription: workOrder?.issue,
      } as AssignTechnicianBody);
    } else if (actionType === 'remove-value') {
      const removedTechnician = actionMeta.removedValue as OptionType;
      await axios.post('/api/remove-technician', {
        workOrderId,
        pmEmail: user.pmEmail,
        technicianEmail: removedTechnician.value,
        technicianName: removedTechnician.label,
      } as AssignTechnicianBody);
    }
    await getWorkOrder();
    await getWorkOrderEvents();
    setLoadingAssignedTechnicians(false);
  };

  if (workOrder && !isLoading) {
    const allStatuses: IWorkOrder['status'][] = ['TO_DO', 'COMPLETE'];
    const options = allStatuses.map((o) => ({ label: o, value: o }));
    return (
      <div id="work-order">
        <AssignTechnicianModal
          assignTechnicianModalIsOpen={openAssignTechnicianModal}
          setAssignTechnicianModalIsOpen={setOpenAssignTechnicianModal}
          workOrderId={workOrderId}
          onSuccessfulAdd={() => {
            getWorkOrder();
            getWorkOrderEvents();
          }}
        />
        <AddCommentModal
          addCommentModalIsOpen={openAddCommentModal}
          setAddCommentModalIsOpen={setOpenAddCommentModal}
          workOrderId={workOrderId}
          onSuccessfulAdd={() => {
            getWorkOrder();
            getWorkOrderEvents();
          }}
        />
        <div className="flex flex-col w-full align-middle items-center">
          <div className="text-3xl my-auto flex flex-row items-end text-gray-600">
            {toTitleCase(workOrder?.issue)}
            {workOrderId && <div className="hidden md:inline text-lg ml-4 text-gray-300"># {deconstructKey(workOrderId)}</div>}
          </div>
          <hr className="w-full mt-2" />
          <div className="pt-3 text-md my-auto flex text-gray-600">
            <button id='in-progress' onClick={(e) => handleUpdateStatus(e, STATUS.TO_DO)} className={`${workOrder.status === STATUS.TO_DO && 'bg-blue-200'} rounded px-5 py-3 mr-4 border-2 border-slate-300 flex flex-col items-center hover:bg-blue-100 disabled:opacity-25`}>
              <GoTasklist />
              <span className="text-xs">Todo</span>
            </button>
            <button onClick={(e) => handleUpdateStatus(e, STATUS.COMPLETE)} className={`${workOrder.status === STATUS.COMPLETE && 'bg-blue-200'} rounded px-2 py-3 mr-4 border-2 border-slate-300 flex flex-col items-center hover:bg-blue-100 disabled:opacity-25`}>
              <AiOutlineCheck color={'green'} />
              <span className="text-xs text-green-700">Complete</span>
            </button>
          </div>
          {isMobile ? (
            <div className="flex align-middle pt-2 pb-6">
              <button
                className="bg-blue-200 p-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-full"
                onClick={() => setOpenAssignTechnicianModal(true)}>
                Assigned Technicians
              </button>
            </div>
          ) : (
            <div className='flex flex-row items-center align-middle justify-center w-3/4 h-12 mt-4'>
              <span className='mr-8 text-lg'>Assigned To: </span>
              <AsyncSelect
                placeholder={loadingAssignedTechnicians ? "Loading..." : assignedTechnicians.length === 0 ? 'Unassigned' : 'Assign technicians...'}
                menuPosition="fixed"
                className={'w-2/5 my-auto'}
                closeMenuOnSelect={false}
                isMulti
                defaultOptions={technicianOptions}
                value={assignedTechnicians}
                captureMenuScroll={true}
                loadOptions={searchTechnicians}
                isLoading={loadingAssignedTechnicians}
                onChange={handleAssignTechnician}
                isClearable={false}
              />
            </div>
          )}
        </div>
        <div className="flex md:flex-row flex-col md:mt-4 w-full justify-center align-middle">
          <div className="text-xl text-gray-600 mr-4 text-center">Work Order History:</div>
          <button
            className="bg-blue-200 p-1 text-gray-600 hover:bg-blue-300 mx-auto md:mx-0 rounded disabled:opacity-25 h-8 w-32"
            onClick={() => setOpenAddCommentModal(true)}>
            + Comment
          </button>
        </div>
        <div className="h-full">
            {isLoadingEvents && <div className="flex mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-3 py-3 px-4 text-left">
              <div className="dot animate-loader"></div>
              <div className="dot animate-loader animation-delay-200"></div>
              <div className="dot animate-loader animation-delay-400"></div>
            </div>}
            {events ?
              events.map((event: IEvent | null, i: number) => {
                if (event) {
                  const date = new Date(event.created);

                  const formattedDate = [date.getMonth() + 1, date.getDate(), date.getFullYear()].join('/');
                  let hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
                  const minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
                  const AM_PM = date.getHours() >= 12 ? 'PM' : 'AM';
                  hours = hours < 10 ? 0 + hours : hours;
                  const formattedTime = hours + ':' + minutes + ' ' + AM_PM;

                  return (
                    <div key={i} className="mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-4 mb-3 py-2 px-4 text-left">
                      <div className="text-sm text-gray-500">{event.updateMadeBy}</div>
                      <div className="text-sm text-gray-500">
                        {formattedDate} @{formattedTime}
                      </div>
                      <div className="break-words">{event.updateDescription}</div>
                    </div>
                  );
                }
              }): 'No events found'}
        </div>
      </div>
    );
  }
  if (isLoading) {
    return <div>loading...</div>;
  }
  return (
    <div>
      <div>None</div>
    </div>
  );
};

export default WorkOrder;
