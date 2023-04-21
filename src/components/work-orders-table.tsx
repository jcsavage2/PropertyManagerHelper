import { useUserContext } from "@/context/user";
import { IWorkOrder } from "@/database/entities/work-order";
import { generateAddressKey, toTitleCase } from "@/utils";
import axios from "axios";
import { AiOutlineFilter } from "react-icons/ai";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { BiCheckbox, BiCheckboxChecked } from "react-icons/bi";
import Link from "next/link";


type HandleUpdateStatusProps = {
  pk: string;
  sk: string;
};
export const WorkOrdersTable = () => {
  const [workOrders, setWorkOrders] = useState<Array<IWorkOrder>>([]);

  const [sortField, setSortField] = useState<string>("status");
  const [isUpdating, setIsUpdating] = useState(false);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [statusFilters, setStatusFilters] = useState<Record<IWorkOrder["status"], boolean>>({
    TO_DO: true,
    COMPLETE: true
  });
  const [showSelectFilter, setShowSelectFilter] = useState(false);
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
        const newWorkOrders = workOrders.map(wo => wo.pk === updatedWorkOrder.pk ? updatedWorkOrder : wo).sort((a, b) => {
          return (
            a[sortField].toString().localeCompare(b[sortField].toString(), "en", {
              numeric: true,
            }) * (order === "asc" ? 1 : -1)
          );
        });;
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
  const sortedWorkOrders = filteredRows.map((workOrder): any => {
    return (
      <tr key={uuid()}>
        {columns.map(({ accessor }, index) => {
          const allStatuses: IWorkOrder["status"][] = ["TO_DO", "COMPLETE"];
          const remainingOptions = allStatuses.filter(s => s !== workOrder.status);
          const isStatusAccessor = accessor === "status";
          const workOrderId = `${workOrder.pk}`;
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
                  <option value={tData}>{tData}</option>
                  {remainingOptions.map((o) => {
                    return <option key={o} value={o}>{o}</option>;
                  })}
                </select>
              </td>
            );
          }
          return (
            <td className="border px-4 py-1" key={accessor}>
              <Link key={workOrder.pk + index} href={`/work-orders/?workOrderId=${encodeURIComponent(workOrderId)}`} as={`/work-order/${encodeURIComponent(workOrderId)}`}>
                {tData}
              </Link>
            </td>
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
      <div className="flex">
        <button className={`py-1 mr-2 px-3 rounded ${statusFilters.TO_DO ? "bg-blue-200" : "bg-gray-200"}`} onClick={() => setShowSelectFilter((s) => !s)}>
          Status
        </button>
        <div className="my-auto flex mr-2">
          <AiOutlineFilter className="mr-1 my-auto" />
          Filters
        </div>
      </div>
      {showSelectFilter && (
        <div className="absolute z-10 rounded bg-white p-5 mt-1 w-52 shadow-[0px_10px_20px_2px_rgba(0,0,0,0.3)] grid grid-cols-1 gap-y-4">
          <div className={`flex ${statusFilters.TO_DO ? "hover:bg-blue-200" : "hover:bg-gray-200"}`}>
            <p className={`py-1 px-3 cursor-pointer flex w-full rounded`} onClick={() => setStatusFilters({ ...statusFilters, TO_DO: !statusFilters.TO_DO })}>
              To Do
            </p>
            {!statusFilters.TO_DO ? (<BiCheckbox className="mr-3 justify-self-end my-auto flex-end" size={"1.5em"} />) : (
              <BiCheckboxChecked className="mr-3 justify-self-end my-auto flex-end" size={"1.5em"} />
            )}
          </div>

          <div className={`flex ${statusFilters.COMPLETE ? "hover:bg-blue-200" : "hover:bg-gray-200"}`}>
            <p className={`py-1 px-3 cursor-pointer flex w-full rounded ${statusFilters.COMPLETE ? "hover:bg-blue-200" : "hover:bg-gray-200"}`} onClick={() => setStatusFilters({ ...statusFilters, COMPLETE: !statusFilters.COMPLETE })}>
              Complete
            </p>
            {!statusFilters.COMPLETE ? (<BiCheckbox className="mr-3 justify-self-end my-auto flex-end" size={"1.5em"} />) : (
              <BiCheckboxChecked className="mr-3 justify-self-end my-auto flex-end" size={"1.5em"} />
            )}
          </div>

        </div>
      )}
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
            {sortedWorkOrders}
          </tbody>
        </table>
      </div >
    </div>
  );
};

export default WorkOrdersTable;;;