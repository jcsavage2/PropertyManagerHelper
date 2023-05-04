import { IEvent } from '@/database/entities/event';
import { IWorkOrder } from '@/database/entities/work-order';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { AssignTechnicianModal } from './assign-technician-modal';
import { useDevice } from '@/hooks/use-window-size';
import { toTitleCase, deconstructKey } from '@/utils';
import Select from 'react-select';
import { useUserContext } from '@/context/user';
import { AddCommentModal } from './add-comment-modal';

const WorkOrder = ({ workOrderId }: { workOrderId: string; }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [workOrder, setWorkOrder] = useState<IWorkOrder | null>(null);
  const [events, setEvents] = useState<Array<IEvent | null>>([]);
  const { user } = useUserContext();

  const [openAssignTechnicianModal, setOpenAssignTechnicianModal] = useState(false);
  const [openAddCommentModal, setOpenAddCommentModal] = useState(false);
  const { isMobile } = useDevice();

  const renderAssignedTechnicians = () => {
    if (workOrder && workOrder.assignedTo) {
      return (
        <div className="overflow-scroll flex flex-col text-base h-24">
          {Array.from(workOrder.assignedTo)?.map((email: string, index: number) =>
            index !== Array.from(workOrder.assignedTo)?.length - 1 ? (
              <span className="px-2 pb-.5" key={email}>
                {email},{' '}
              </span>
            ) : (
              <span className="px-2" key={email}>
                {email}
              </span>
            )
          )}
        </div>
      );
    } else {
      return <span>None</span>;
    }
  };

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

  const handleUpdateStatus = async (value: string) => {
    setIsUpdatingStatus(true);
    setIsLoadingEvents(true);
    //@ts-ignore
    const { data } = await axios.post("/api/update-work-order", { pk: workOrder.pk, sk: workOrder.sk, status: value, email: deconstructKey(user.pk) });
    const updatedWorkOrder = JSON.parse(data.response);
    if (updatedWorkOrder) {
      setWorkOrder(updatedWorkOrder.Attributes);
    }
    getWorkOrderEvents();
    setIsUpdatingStatus(false);
  };

  useEffect(() => {
    getWorkOrder();
    getWorkOrderEvents();
  }, []);

  if (workOrder && !isLoading) {
    const allStatuses: IWorkOrder["status"][] = ["TO_DO", "COMPLETE"];
    const options = allStatuses.map(o => ({ label: o, value: o }));
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
        <div className="md:flex flex-column md:flex-row w-full justify-center md:justify-between md:content-between">
          <div>
            <div className="text-lg my-auto text-gray-600">{toTitleCase(workOrder?.issue)}</div>
            <hr />
            <div className="pt-3 text-md my-auto flex text-gray-600">
              <label className="my-auto pr-2" htmlFor='status-select'>{"Status:" + ""}</label>
              {!isUpdatingStatus &&
                <Select
                  id="status-select"
                  className={`
                  cursor-pointer
                  rounded 
                  p-1 
                  w-48
                  ${workOrder?.status === "TO_DO" ? "bg-yellow-200" : "bg-green-200"} 
                `}
                  value={{ label: workOrder?.status }}
                  isClearable={false}
                  blurInputOnSelect={false}
                  onChange={(v) => {
                    if (v) {
                      //@ts-ignore
                      handleUpdateStatus(v.value);
                    }
                  }}
                  //@ts-ignore
                  options={options}
                />}
            </div>
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
            <div className="flex flex-row">
              <button
                className="mr-4 md:mt-0 bg-blue-200 p-2 mb-auto text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-40 justify-self-end text-center"
                onClick={() => setOpenAssignTechnicianModal(true)}>
                + Assign Technician
              </button>
              <div className="text-xl my-auto text-gray-600">
                Assigned To: {renderAssignedTechnicians()}
              </div>
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
        <div className="overflow-scroll h-full">
          {isLoadingEvents ? (
            <div className="flex mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-3 py-3 px-4 text-left">
              <div className="dot animate-loader"></div>
              <div className="dot animate-loader animation-delay-200"></div>
              <div className="dot animate-loader animation-delay-400"></div>
            </div>
          ) : (
            (events &&
              events.map((event: IEvent | null, i: number) => {
                if (event) {
                  const date = new Date(event.created);

                  const formattedDate = [date.getMonth() + 1,
                  date.getDate(),
                  date.getFullYear()].join("/");
                  let hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
                  const minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
                  const AM_PM = date.getHours() >= 12 ? "PM" : "AM";
                  hours = hours < 10 ? 0 + hours : hours;
                  const formattedTime = hours + ":" + minutes + " " + AM_PM;;

                  return (
                    <div
                      key={i}
                      className="mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-4 mb-3 py-2 px-4 text-left">
                      <div className='text-sm text-gray-500'>{event.updateMadeBy}</div>
                      <div className='text-sm text-gray-500'>{formattedDate} @{formattedTime}</div>
                      <div className='break-words'>{event.updateDescription}</div>
                    </div>
                  );
                }
              })) ??
            'No events found'
          )}
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
