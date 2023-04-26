import { IEvent } from '@/database/entities/event';
import { IWorkOrder } from '@/database/entities/work-order';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { AssignTechnicianModal } from './assign-technician-modal';
import { useDevice } from '@/hooks/use-window-size';

const WorkOrder = ({ workOrderId }: { workOrderId: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [workOrder, setWorkOrder] = useState<IWorkOrder | null>(null);
  const [events, setEvents] = useState<Array<IEvent | null>>([]);
  const [openAssignTechnicianModal, setOpenAssignTechnicianModal] = useState(false);
  const { isMobile } = useDevice();

  const renderAssignedTechnicians = () => {
    if (workOrder && workOrder.assignedTo) {
      return (
        <div className="overflow-scroll flex flex-col text-base h-24">
          {Array.from(workOrder.assignedTo).map((email: string, index: number) =>
            index !== Array.from(workOrder.assignedTo).length - 1 ? (
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

  async function getWorkOrder() {
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
  }
  async function getWorkOrderEvents() {
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
  }

  useEffect(() => {
    getWorkOrder();
    getWorkOrderEvents();
  }, [workOrderId]);

  if (workOrder && !isLoading) {
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
        <div className="md:flex flex-column md:flex-row w-full justify-center md:justify-between md:content-between">
          <div>
            <div className="text-xl my-auto text-gray-600">Issue: {workOrder.issue}</div>
            <div className="text-xl my-auto text-gray-600">Status: {workOrder.status}</div>
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

        <div className="text-xl my-auto text-gray-600 text-center">Work Order History:</div>
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
                  return (
                    <div
                      key={i}
                      className="mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-4 mb-3 py-2 px-4 text-left">
                      <div>{event.updateType}</div>
                      <div>{event.updateDescription}</div>
                      <div>Update made by: {event.updateMadeBy}</div>
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
