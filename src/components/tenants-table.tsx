import { createdToFormattedDateTime, toTitleCase } from "@/utils";
import { AiOutlineFilter } from "react-icons/ai";
import { useState } from "react";
import { v4 as uuid } from "uuid";
import Link from "next/link";
import { ITenant } from "@/database/entities/tenant";

interface ITenantsTableProps {
  tenants: ITenant[];
}

export const TenantsTable = ({ tenants }: ITenantsTableProps) => {

  const [sortField, setSortField] = useState<keyof ITenant>("tenantName");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const [cityFilter, setCityFilter] = useState<string | null | undefined>(null);
  const [showCityFilter, setShowCityFilter] = useState(false);

  const [addressFilter, setAddressFilter] = useState<string | null | undefined>(null);
  const [showAddressFilter, setShowAddressFilter] = useState(false);

  const [stateFilter, setStateFilter] = useState<string | null | undefined>(null);
  const [showStateFilter, setShowStateFilter] = useState(false);

  const columns: { label: string, accessor: keyof ITenant; width: string; }[] = [
    { label: "Name", accessor: "tenantName", width: "w-72" },
    { label: "Email", accessor: "tenantEmail", width: "" },
  ];

  const remappedProperties = tenants.map(tenant => {
    const { tenantName, tenantEmail, pk, sk, created, status } = tenant;
    const date = new Date(created);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    return {
      pk,
      sk,
      tenantEmail,
      tenantName,
      status,
      created: formattedDate
    };
  });

  const filteredRows = remappedProperties.filter(property => !!cityFilter);
  const sortedWorkOrders = filteredRows.map((workOrder): any => {
    return (
      <tr key={uuid()}>
        {columns.map(({ accessor }, index) => {
          const workOrderId = `${workOrder.pk}`;
          //@ts-ignore
          const tData = workOrder[accessor];
          return (
            <td className="border px-4 py-1" key={accessor}>
              <Link key={workOrder.pk + index} href={`/tenants/?tenantId=${encodeURIComponent(workOrderId)}`} as={`/tenants/?tenantId=${encodeURIComponent(workOrderId)}`}>
                {tData}
              </Link>
            </td>
          );
        })}
      </tr>
    );
  });

  return (
    <div className="mt-8 mb-4">
      <div className="flex">
        <div>
          <button className={`py-1 mr-2 px-3 rounded ${!!addressFilter ? "bg-blue-200" : "bg-gray-200"}`} onClick={() => setShowAddressFilter((s) => !s)}>
            Address
          </button>
        </div>
        <div>
          <button className={`py-1 mr-2 px-3 rounded ${!!cityFilter ? "bg-blue-200" : "bg-gray-200"}`} onClick={() => setShowCityFilter((s) => !s)}>
            City
          </button>
          {showCityFilter && (
            <div className="absolute z-10 rounded bg-white p-5 mt-1 w-52 shadow-[0px_10px_20px_2px_rgba(0,0,0,0.3)] grid grid-cols-1 gap-y-4">
              City
            </div>
          )}
        </div>
        <div>
          <button className={`py-1 mr-2 px-3 rounded ${!!cityFilter ? "bg-blue-200" : "bg-gray-200"}`} onClick={() => setShowStateFilter((s) => !s)}>
            State
          </button>
          {showStateFilter && (
            <div className="absolute z-10 rounded bg-white p-5 mt-1 w-52 shadow-[0px_10px_20px_2px_rgba(0,0,0,0.3)] grid grid-cols-1 gap-y-4">
              State
            </div>
          )}
        </div>
        <div className="my-auto flex mr-2">
          <AiOutlineFilter className="mr-1 my-auto" />
          Filters
        </div>
      </div>
      {showAddressFilter && (
        <div className="absolute z-10 rounded bg-white p-5 mt-1 w-52 shadow-[0px_10px_20px_2px_rgba(0,0,0,0.3)] grid grid-cols-1 gap-y-4">
          Address
        </div>
      )}

      <div className="overflow-x-auto">
        <table className='w-full mt-4 border-spacing-x-10 table-auto'>
          <thead className=''>
            <tr className='text-left text-gray-400'>
              <th className='font-normal'>Name</th>
              <th className='font-normal'>Email</th>
              <th className='font-normal'>Status</th>
              <th className='font-normal'>Primary Address</th>
              <th className='font-normal'>Created</th>
            </tr>
          </thead>
          <tbody className='text-gray-700'>
            {tenants.map((tenant: any) => {
              const primaryAddress: any = Object.values(tenant.addresses ?? []).find((a: any) => !!a.isPrimary);
              return (
                <tr
                  key={`${tenant.pk}-${tenant.sk}`}
                >
                  <td className="border px-4 py-1">
                    {`${toTitleCase(tenant.tenantName)}`}
                  </td>
                  <td className="border px-4 py-1">
                    {`${tenant.tenantEmail}`}
                  </td>
                  <td className="border px-4 py-1">
                    {tenant.status}
                  </td>
                  <td className="border px-4 py-1">
                    {primaryAddress.address + " " + primaryAddress.unit}
                  </td>
                  <td className="border px-4 py-1">
                    {createdToFormattedDateTime(tenant._ct)[0]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div >
    </div>
  );
};