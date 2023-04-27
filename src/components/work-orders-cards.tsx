import { deconstructKey, toTitleCase } from "@/utils";
import { v4 as uuid } from "uuid";
import { IWorkOrder } from "@/database/entities/work-order";
import { useEffect, useState } from "react";
import { useUserContext } from "@/context/user";
import axios from "axios";
import Link from "next/link";

type HandleUpdateStatusProps = {
  pk: string;
  sk: string;
};

export const WorkOrdersCards = () => {
  const [workOrders, setWorkOrders] = useState<IWorkOrder[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useUserContext();

  useEffect(() => {
    async function get() {
      if (isUpdating || !user.pmEmail) {
        return;
      }
      const { data } = await axios.post("/api/get-all-work-orders-for-pm", { propertyManagerEmail: user.pmEmail });
      const orders: IWorkOrder[] = JSON.parse(data.response);
      if (orders.length) {
        setWorkOrders(orders);
      }
    }
    get();
  }, [user.pmEmail, isUpdating]);

  const handleUpdateStatus: ({ pk, sk }: HandleUpdateStatusProps) =>
    React.ChangeEventHandler<HTMLSelectElement> = ({ pk, sk }: HandleUpdateStatusProps) => async (e) => {
      setIsUpdating(true);
      const newStatus = e.target.value;
      const { data } = await axios.post("/api/update-work-order", { pk, sk, status: newStatus, email: deconstructKey(user.pk) });
      const updatedWorkOrder = JSON.parse(data.response);
      if (updatedWorkOrder) {
        const newWorkOrders = workOrders.map(wo => wo.pk === updatedWorkOrder.pk ? updatedWorkOrder : wo);
        setWorkOrders(newWorkOrders);
      }
      setIsUpdating(false);
    };

  return (
    <div className="mt-8">
      <div className="grid gap-y-2">
        {workOrders?.map((workOrder, index) => {
          const { status } = workOrder;
          const allStatuses: IWorkOrder["status"][] = ["TO_DO", "COMPLETE"];
          const remainingOptions = allStatuses.filter(s => s !== workOrder.status);
          return (
            <div
              className="py-4 px-2 bg-gray-100 rounded w-full shadow-[0px_1px_5px_0px_rgba(0,0,0,0.3)]"
              key={`${workOrder.pk}-${workOrder.sk}-${index}`}
            >
              <Link key={workOrder.pk + index} href={`/work-orders/?workOrderId=${encodeURIComponent(workOrder.pk)}`} as={`/work-orders/?workOrderId=${encodeURIComponent(workOrder.pk)}`}>
                <p className="text-lg text-gray-800">{toTitleCase(workOrder.issue)} </p>
                <select
                  className={`cursor-pointer rounded p-1 ${status === "TO_DO" && "bg-yellow-200"} ${status === "COMPLETE" && "bg-green-200"}`}
                  value={status}
                  onChange={handleUpdateStatus({ pk: workOrder.pk, sk: workOrder.sk })}
                >
                  <option value={status}>{status}</option>
                  {remainingOptions.map((o) => {
                    return <option key={o} value={o}>{o}</option>;
                  })}
                </select>
                <p className="text-sm font-light">Address: {workOrder.address.address}</p>
                <p className="text-sm font-light">Unit: {workOrder.address.unit ?? "N/A"}</p>
                <p className="text-sm mt-1 font-light">Assigned To: {workOrder.assignedTo ?? "Unassigned"} </p>
                <p className="text-sm mt-1 font-light">Created By: {workOrder.createdBy ?? "Unassigned"} </p>
              </Link>
            </div>
          );
        })}
      </div >
    </div>
  );
};

export default WorkOrdersCards;