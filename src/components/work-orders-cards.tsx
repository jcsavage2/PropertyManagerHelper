import { deconstructKey, setToShortenedString, toTitleCase } from "@/utils";
import { IWorkOrder } from "@/database/entities/work-order";
import { useEffect, useState, useCallback } from "react";
import { useUserContext } from "@/context/user";
import axios from "axios";
import Link from "next/link";
import { useDevice } from "@/hooks/use-window-size";
import Select, { SingleValue } from "react-select";
import { BiRefresh } from "react-icons/bi";
import { STATUS } from "@/constants";
import { StatusOptions } from "./work-orders-table";
import { StatusOptionType } from "@/types";

type HandleUpdateStatusProps = {
  val: SingleValue<StatusOptionType>;
  pk: string;
  sk: string;
};

export const WorkOrdersCards = () => {
  const [workOrders, setWorkOrders] = useState<IWorkOrder[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const { user } = useUserContext();
  const { isMobile } = useDevice();

  const fetchWorkOrders = useCallback(async () => {
    if (isUpdating || (!user.pmEmail && !user.userType)) {
      return;
    }
    setIsFetching(true);
    if (user.userType === "TECHNICIAN") {
      const { data } = await axios.post("/api/get-all-work-orders-for-technician", { technicianEmail: user.technicianEmail });
      const orders: IWorkOrder[] = JSON.parse(data.response);
      if (orders.length) {
        sessionStorage.setItem("WORK_ORDERS", JSON.stringify(orders));
        setWorkOrders(orders);
      }
    } else if (user.userType === "PROPERTY_MANAGER") {
      const { data } = await axios.post("/api/get-all-work-orders-for-pm", { propertyManagerEmail: user.pmEmail });
      const orders: IWorkOrder[] = JSON.parse(data.response);
      if (orders.length) {
        sessionStorage.setItem("", JSON.stringify(orders));
        setWorkOrders(orders);
      }
    } else {
      const { data } = await axios.post('/api/get-all-work-orders-for-tenant', { tenantEmail: deconstructKey(user.pk) });
      const orders: IWorkOrder[] = JSON.parse(data.response);
      if (orders.length) {
        sessionStorage.setItem('', JSON.stringify(orders));
        setWorkOrders(orders);
      }
    }

    setIsFetching(false);
  }, [isUpdating, user]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const handleUpdateStatus = async ({ pk, sk, val }: HandleUpdateStatusProps) => {
    setIsUpdating(true);
    //@ts-ignore
    const { data } = await axios.post("/api/update-work-order", { pk, sk, status: val.value, email: deconstructKey(user.pk) });
    const updatedWorkOrder = JSON.parse(data.response);
    if (updatedWorkOrder) {
      const newWorkOrders = workOrders.map(wo => wo.pk === updatedWorkOrder.pk ? updatedWorkOrder : wo);
      setWorkOrders(newWorkOrders);
    }
    setIsUpdating(false);
  };

  const formattedStatusOptions = ({ value, label, icon }: { value: string; label: string; icon: any; }) => (
    <div className="flex flex-row items-center">
      {icon}
      <span className="ml-1 text-sm">{label}</span>
    </div>
  );

  return (
    <>
      <button className="mt-2 ml-2 md:mt-0 bg-blue-200 p-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 text-center"
        onClick={fetchWorkOrders}
        disabled={isFetching || isUpdating}
      >
        <BiRefresh className='text-2xl' />
      </button>
      <div className={`mt-8 ${isMobile ? " pb-24" : "pb-0"}`}>
        <div className="grid gap-y-3">
          {workOrders?.map((workOrder, index) => {
            const { status, assignedTo } = workOrder;
            const assignedToString = setToShortenedString(assignedTo);
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
                  ${status === STATUS.TO_DO ? "bg-yellow-200" : "bg-green-200"} 
                `}
                  value={StatusOptions.find((o) => o.value === status)}
                  blurInputOnSelect={false}
                  formatOptionLabel={formattedStatusOptions}
                  onChange={(v) => {
                    if (v) {
                      //@ts-ignore
                      handleUpdateStatus({ pk: workOrder.pk, sk: workOrder.sk, val: v });
                    }
                  }}
                  options={StatusOptions}
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
        </div>
      </div>
    </>
  );
};

export default WorkOrdersCards;