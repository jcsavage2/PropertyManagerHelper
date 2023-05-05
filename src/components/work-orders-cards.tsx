import { deconstructKey, toTitleCase } from "@/utils";
import { IWorkOrder } from "@/database/entities/work-order";
import { useEffect, useState } from "react";
import { useUserContext } from "@/context/user";
import axios from "axios";
import Link from "next/link";
import { useDevice } from "@/hooks/use-window-size";
import Select from "react-select";
import { BiRefresh } from "react-icons/bi";

type HandleUpdateStatusProps = {
  pk: string;
  sk: string;
  value: IWorkOrder["status"];
};

export const WorkOrdersCards = () => {
  const [workOrders, setWorkOrders] = useState<IWorkOrder[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const { user } = useUserContext();
  const { isMobile } = useDevice();

  const fetchWorkOrders = async () => {
    if (isFetching || isUpdating || !user.pmEmail) {
      return;
    }
    setIsFetching(true);
    const { data } = await axios.post("/api/get-all-work-orders-for-pm", { propertyManagerEmail: user.pmEmail });
    const orders: IWorkOrder[] = JSON.parse(data.response);
    if (orders.length) {
      setWorkOrders(orders);
    }
    setIsFetching(false);
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [user.pmEmail, isUpdating]);

  const handleUpdateStatus = async ({ pk, sk, value }: HandleUpdateStatusProps) => {
    setIsUpdating(true);
    //@ts-ignore
    const { data } = await axios.post("/api/update-work-order", { pk, sk, status: value, email: deconstructKey(user.pk) });
    const updatedWorkOrder = JSON.parse(data.response);
    if (updatedWorkOrder) {
      const newWorkOrders = workOrders.map(wo => wo.pk === updatedWorkOrder.pk ? updatedWorkOrder : wo);
      setWorkOrders(newWorkOrders);
    }
    setIsUpdating(false);
  };

  return (
    <>
      <button className="mt-2 ml-2 md:mt-0 bg-blue-200 p-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 text-center"
        onClick={fetchWorkOrders}
        disabled={isFetching || isUpdating}
      >
        <BiRefresh className='text-2xl'/>
      </button>
      <div className={`mt-8 ${isMobile ? " pb-24" : "pb-0"}`}>
        <div className="grid gap-y-3">
          {workOrders?.map((workOrder, index) => {
            const { status } = workOrder;
            const allStatuses: IWorkOrder["status"][] = ["TO_DO", "COMPLETE"];
            const options = allStatuses.map(o => ({ label: o, value: o })) as { label: string; value: string; }[];

            const assignees = workOrder?.assignedTo ? Array.from(workOrder.assignedTo) : []
            const assignedToString = assignees.length ? assignees.length > 1 ? (assignees[0] + '... +' + (assignees.length - 1))  : assignees[0] : "Unassigned"
            return (
              <div
                className="py-4 px-2 bg-gray-100 rounded w-full shadow-[0px_1px_5px_0px_rgba(0,0,0,0.3)]"
                key={`${workOrder.pk}-${workOrder.sk}-${index}`}
              >
                <p className="text-lg text-gray-800">{toTitleCase(workOrder.issue)} </p>
                <Select
                  className={`
                  cursor-pointer
                  rounded 
                  p-1 
                  w-48
                  ${status === "TO_DO" ? "bg-yellow-200" : "bg-green-200"} 
                `}
                  value={{ label: status }}
                  isClearable={false}
                  blurInputOnSelect={false}
                  onChange={(v) => {
                    if (v) {
                      //@ts-ignore
                      handleUpdateStatus({ pk: workOrder.pk, sk: workOrder.sk, value: v.value });
                    }
                  }}
                  //@ts-ignore
                  options={options}
                />
                <p className="text-sm font-light">{(workOrder.address.address + " " + (workOrder?.address?.unit ?? ""))} </p>
                <p className="text-sm font-light">Permission to Enter: {workOrder.permissionToEnter}</p>
                <p className="text-sm mt-1 font-light">Assigned To: {assignedToString} </p>
                <div className="grid grid-cols-2">
                  {workOrder.createdBy && <p className="text-sm mt-1 font-light">Created By: {workOrder.createdBy} </p>}
                  <Link className="justify-self-end my-auto px-4 py-1 bg-slate-500 text-slate-100 rounded" key={workOrder.pk + index} href={`/work-orders/?workOrderId=${encodeURIComponent(workOrder.pk)}`} as={`/work-orders/?workOrderId=${encodeURIComponent(workOrder.pk)}`}>
                    Open Details
                  </Link>

                </div>
              </div>
            );
          })}
        </div >
      </div>
    </>
  );
};

export default WorkOrdersCards;