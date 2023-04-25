import { IEvent } from "@/database/entities/event";
import { IWorkOrder } from "@/database/entities/work-order";
import axios from "axios";
import { useEffect, useState } from "react";
import { AssignTechnicianModal } from "./assign-technician-modal";
import { deconstructKey } from "@/utils";


const WorkOrder = ({ workOrderId }: { workOrderId: string; }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [workOrder, setWorkOrder] = useState<IWorkOrder | null>(null);
  const [events, setEvents] = useState<Array<IEvent | null>>([]);
  const [openAssignTechnicianModal, setOpenAssignTechnicianModal] = useState(false);

  const renderAssignedTechnicians = () => {
    if (workOrder && workOrder.assignedTo) {
        return (
        <>
            {Array.from(workOrder.assignedTo).map((email: string, index: number) => (
            index !== Array.from(workOrder.assignedTo).length - 1 ? (
                <span key={email}>{email}, </span>
            ) : (
                <span key={email}>{email}</span>
            )
            ))}
        </>
        );
    } else {
        return <span>No one has been assigned to this work order</span>;
    }
  };


  async function getWorkOrder() {
      try {
        if (!workOrderId) {
          return;
        }
        const { data } = await axios.post("/api/get-work-order", { pk: workOrderId, sk: workOrderId });
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
        const { data } = await axios.post("/api/get-work-order-events", { workOrderId });
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
      <div id='testing'>
        <AssignTechnicianModal assignTechnicianModalIsOpen={openAssignTechnicianModal} setAssignTechnicianModalIsOpen={setOpenAssignTechnicianModal}
            workOrderId={deconstructKey(workOrder.pk)} onSuccessfulAdd={() => {getWorkOrder(); getWorkOrderEvents();}}
        />
        <div>Issue: {workOrder.issue}</div>
        <div>Status: {workOrder.status}</div>
        <div>
          Assigned To: {renderAssignedTechnicians()}
        </div>
        <button
          className="mt-2 md:mt-0 bg-blue-200 p-2 mb-auto text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-40 justify-self-end text-center"
          onClick={() => setOpenAssignTechnicianModal(true)}
        >+ Assign Technician</button>
        <div>Work Order History: 
            {isLoadingEvents ? <div>Loading work order events...</div> : (events && events.map((event: IEvent | null, i: number) => {
                if (event) {
                    return (
                    <div key={i}>
                        <div>{event.updateType}</div>
                        <div>{event.updateDescription}</div>
                        <div>{event.updateMadeBy}</div>
                    </div>
                    )
                }
            })) ?? "No events found"}
        </div>
      </div >
    );
  }
  if (isLoading) {
    return <div>loading...</div>;
  }
  return (
    <div >
      <div>None</div>
    </div >
  );
};

export default WorkOrder;