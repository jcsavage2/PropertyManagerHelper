import { useUserContext } from "@/context/user";
import { IWorkOrder, WorkOrderStatus } from "@/database/entities/work-order";
import { generateAddressKey, toTitleCase } from "@/utils";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";


type HandleUpdateStatusProps = {
  pk: string;
  sk: string;
};
export const WorkOrdersTable = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [sortField, setSortField] = useState("");
  const [order, setOrder] = useState("asc");

  const [statusFilters, setStatusFilters] = useState({
    TO_DO: true,
    COMPLETE: false
  });

  const [workOrders, setWorkOrders] = useState<Array<IWorkOrder>>([]);
  const { user } = useUserContext();

  useEffect(() => {
    async function get() {
      if (isUpdating) {
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


  const handleSorting = (sortField: keyof IWorkOrder, sortOrder: "asc" | "desc") => {
    if (sortField) {
      const sorted = workOrders.sort((a, b) => {
        return (
          a[sortField].toString().localeCompare(b[sortField].toString(), "en", {
            numeric: true,
          }) * (sortOrder === "asc" ? 1 : -1)
        );
      });
      setWorkOrders(sorted);
    }
  };

  const handleUpdateStatus: ({ pk, sk }: HandleUpdateStatusProps) =>
    React.ChangeEventHandler<HTMLSelectElement> = ({ pk, sk }: HandleUpdateStatusProps) => async (e) => {
      setIsUpdating(true);
      const newStatus = e.target.value;
      const { data } = await axios.post("/api/update-work-order", { pk, sk, status: newStatus });
      const updatedWorkOrder = JSON.parse(data.response);
      if (updatedWorkOrder) {
        const newWorkOrders = workOrders.map(wo => wo.pk === updatedWorkOrder.pk ? updatedWorkOrder : wo);
        setWorkOrders(newWorkOrders);
      }
      setIsUpdating(false);
    };

  const columns: { label: string, accessor: keyof IWorkOrder; width: string; }[] = [
    { label: "Title", accessor: "issue", width: "w-72" },
    { label: "Status", accessor: "status", width: "" },
    { label: "Address", accessor: "address", width: "" },
    { label: "Assigned To", accessor: "tenantEmail", width: "" },
    { label: "Created", accessor: "created", width: "" },
    { label: "Created By", accessor: "tenantName", width: "" },
  ];

  const remappedWorkOrders = workOrders.map(wo => {
    const { status, address, tenantEmail, created, tenantName } = wo;
    const date = new Date(created);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    const addressString = generateAddressKey({ address: address?.address, unit: wo?.address?.unit ?? "" });
    return {
      pk: wo.pk,
      sk: wo.sk,
      issue: toTitleCase(wo.issue),
      status,
      tenantEmail,
      address: addressString,
      created: formattedDate,
      tenantName: toTitleCase(tenantName)
    };
  });

  const filteredRows = remappedWorkOrders.filter(w => !!statusFilters[w.status]);

  const SortedWorkOrders = filteredRows.map((workOrder): any => {
    return (
      <tr key={uuid()}>
        {columns.map(({ accessor }) => {
          const isStatusAccessor = accessor === "status";
          //@ts-ignore
          const tData = workOrder[accessor];
          if (isStatusAccessor) {
            return (
              <td key={accessor} className="border px-4 py-2">
                <select
                  className={`cursor-pointer rounded p-1 ${tData === "TO_DO" && "bg-yellow-200"} ${tData === "COMPLETE" && "bg-green-200"}`}
                  value={tData}
                  onChange={handleUpdateStatus({ pk: workOrder.pk, sk: workOrder.sk })}
                >
                  <option value={"TO_DO"}>{tData}</option>
                  <option value={"TO_DO"}>{"Complete"}</option>
                </select>
              </td>
            );
          }
          return (
            <td className="border px-4 py-1" key={accessor}>{tData}</td>
          );
        })}
      </tr>
    );
  });


  const handleSortingChange = (accessor: keyof IWorkOrder) => {
    const sortOrder =
      accessor === sortField && order === "asc" ? "desc" : "asc";
    setSortField(accessor);
    setOrder(sortOrder);
    handleSorting(accessor, sortOrder);
  };



  return (
    <div className="mt-8">
      <button className={`py-1 px-3 rounded ${statusFilters.TO_DO ? "bg-blue-200" : "bg-gray-200"}`} onClick={() => setStatusFilters({ ...statusFilters, TO_DO: !statusFilters.TO_DO })}>To Do</button>
      <button className={`py-1 px-3 ml-4 rounded ${statusFilters.COMPLETE ? "bg-blue-200" : "bg-gray-200"}`} onClick={() => setStatusFilters({ ...statusFilters, COMPLETE: !statusFilters.COMPLETE })}>Complete</button>
      <div className="overflow-x-auto">
        <table className='w-full mt-4 border-spacing-x-10 table-auto'>
          <thead className=''>
            <tr className='text-left text-gray-400'>
              {columns.map(({ label, accessor, width }) => {
                return (
                  <th
                    className={`font-normal px-4 cursor-pointer ${width}`}
                    key={accessor}
                    onClick={() => handleSortingChange(accessor)}
                  >
                    {label}
                  </th>);
              })}
            </tr>
          </thead>
          <tbody className='text-gray-700'>
            {SortedWorkOrders}
          </tbody>
        </table>
      </div >
    </div>
  );
};

export default WorkOrdersTable;