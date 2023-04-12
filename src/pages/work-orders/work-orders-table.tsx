import { IWorkOrder } from "@/database/entities/work-order";
import { generateAddressKey, toTitleCase } from "@/utils";

type WorkOrdersTableProps = {
  workOrders: IWorkOrder[];
  handleSortStatus: React.MouseEventHandler<HTMLTableCellElement>;
};

export const WorkOrdersTable = ({ workOrders, handleSortStatus }: WorkOrdersTableProps) => {

  return (
    <table className='w-full mt-8'>
      <thead className=''>
        <tr className='text-left text-gray-400'>
          <th className='font-normal'>Title</th>
          <th className='font-normal cursor-pointer' onClick={handleSortStatus}>Status</th>
          <th className='font-normal'>Address</th>
          <th className='font-normal'>Assigned To</th>
          <th className='font-normal'>Created</th>
          <th className='font-normal'>Created By</th>
        </tr>
      </thead>
      <tbody className='text-gray-700'>
        {workOrders.map((wo: any) => {
          const date = new Date(wo.created);
          const addressString = generateAddressKey({ address: wo?.address?.address, unit: wo?.address?.unit ?? "" });
          return (
            <tr key={`${wo.pk}-${wo.sk}`}>
              <td>
                {`${toTitleCase(wo.issue)}`}
              </td>
              <td>
                {wo.sk.split("#")[1] === "TO_DO" ? "To Do" : "Done"}
              </td>
              <td>
                {addressString.toUpperCase()}
              </td>
              <td>
                {"Update"}
              </td>
              <td>
                {`${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`}
              </td>
              <td>
                {toTitleCase(wo.tenantName ?? "-")}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};