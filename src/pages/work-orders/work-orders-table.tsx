import { useUserContext } from "@/context/user";
import { IWorkOrder, WorkOrderStatus } from "@/database/entities/work-order";
import { generateAddressKey, toTitleCase } from "@/utils";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";


export const WorkOrdersTable = () => {
  const [sortField, setSortField] = useState("");
  const [order, setOrder] = useState("asc");
  const [filters, setFilters] = useState([]);
  const [workOrders, setWorkOrders] = useState<Array<IWorkOrder>>([]);
  const { user } = useUserContext();
  const router = useRouter();

  useEffect(() => {
    async function get() {
      const { data } = await axios.post("/api/get-all-work-orders-for-pm", { propertyManagerEmail: user.pmEmail });
      const orders = JSON.parse(data.response);
      if (orders.length) {
        setWorkOrders(orders);
      }
    }
    get();
  }, [user.pmEmail]);

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

  const remappedWorkOrders = workOrders.map(wo => {
    const { status, address, tenantEmail, created, tenantName } = wo;
    const date = new Date(created);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    const addressString = generateAddressKey({ address: address?.address, unit: wo?.address?.unit ?? "" });
    return {
      id: `${wo.pk}:${wo.sk}`,
      issue: toTitleCase(wo.issue),
      status: status === "COMPLETE" ? "Complete" : "To Do",
      tenantEmail,
      address: addressString,
      created: formattedDate,
      tenantName: toTitleCase(tenantName)
    };
  });

  const handleUpdateStatus: (id: string) => React.ChangeEventHandler<HTMLSelectElement> = (t: string) => (e) => {
    console.log(e.target.value, t);
  };

  const columns: { label: string, accessor: keyof IWorkOrder; width: string; }[] = [
    { label: "Title", accessor: "issue", width: "w-72" },
    { label: "Status", accessor: "status", width: "" },
    { label: "Address", accessor: "address", width: "" },
    { label: "Assigned To", accessor: "tenantEmail", width: "" },
    { label: "Created", accessor: "created", width: "" },
    { label: "Created By", accessor: "tenantName", width: "" },
  ];

  const SortedWorkOrders = remappedWorkOrders.map((workOrder): any => {

    return (
      <tr key={uuid()}>
        {columns.map(({ accessor }) => {
          const isStatusAccessor = accessor === "status";
          //@ts-ignore
          const tData = workOrder[accessor];
          if (isStatusAccessor) {
            return (
              <td key={accessor} className="border px-4 py-2">
                <select className="w-10/12 cursor-pointer" onChange={handleUpdateStatus(workOrder.id)}>
                  {tData}
                  <option value={"TO_DO"}>{"To Do"}</option>
                  <option value={"COMPLETE"}>{"Complete"}</option>
                </select>
              </td>);
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
    <div className="overflow-x-auto">
      <table className='w-full mt-8 border-spacing-x-10 table-auto'>
        <thead className=''>
          <tr className='text-left text-gray-400'>
            {columns.map(({ label, accessor, width }) => {
              return <th className={`font-normal px-4 cursor-pointer ${width}`} key={accessor} onClick={() => handleSortingChange(accessor)}>{label}</th>;
            })}
          </tr>
        </thead>
        <tbody className='text-gray-700'>
          {SortedWorkOrders}
        </tbody>
      </table>
    </div >
  );
};

export default WorkOrdersTable;