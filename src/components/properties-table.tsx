import { useUserContext } from "@/context/user";
import { generateAddressKey, toTitleCase } from "@/utils";
import axios from "axios";
import { AiOutlineFilter } from "react-icons/ai";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { BiCheckbox, BiCheckboxChecked } from "react-icons/bi";
import Link from "next/link";
import { IProperty } from "@/database/entities/property";


export const PropertiesTable = () => {
  const [properties, setProperties] = useState<Array<IProperty>>([]);

  const [sortField, setSortField] = useState<keyof IProperty>("city");
  const [isUpdating, setIsUpdating] = useState(false);
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const [cityFilter, setCityFilter] = useState<string | null | undefined>(null);
  const [showCityFilter, setShowCityFilter] = useState(false);

  const [addressFilter, setAddressFilter] = useState<string | null | undefined>(null);
  const [showAddressFilter, setShowAddressFilter] = useState(false);

  const [stateFilter, setStateFilter] = useState<string | null | undefined>(null);
  const [showStateFilter, setShowStateFilter] = useState(false);

  const { user } = useUserContext();


  useEffect(() => {
    async function get() {
      if (isUpdating) {
        return;
      }
      const { data } = await axios.post("/api/get-all-properties-for-pm", { propertyManagerEmail: user.pmEmail });
      const properties: IProperty[] = JSON.parse(data.response);
      if (properties.length) {
        setProperties(properties);
      }
    }
    get();
  }, [user.pmEmail, isUpdating]);


  const handleSorting = (sortField: keyof IProperty, sortOrder: "asc" | "desc") => {
    if (sortField) {
      const sorted = properties.sort((a, b) => {
        return (
          a[sortField].toString().localeCompare(b[sortField].toString(), "en", {
            numeric: true,
          }) * (sortOrder === "asc" ? 1 : -1)
        );
      });
      setProperties(sorted);
    }
  };

  const columns: { label: string, accessor: keyof IProperty; width: string; }[] = [
    { label: "Address", accessor: "address", width: "w-72" },
    { label: "Unit", accessor: "unit", width: "" },
    { label: "City", accessor: "city", width: "" },
    { label: "State", accessor: "state", width: "" },
    { label: "Postal Code", accessor: "postalCode", width: "" },
    { label: "Tenants", accessor: "tenants", width: "" },
  ];

  const remappedProperties = properties.map(property => {
    const { city, unit, address, state, pk, sk, created, tenants = [] } = property;
    const date = new Date(created);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    return {
      pk,
      sk,
      city,
      state,
      unit,
      address: toTitleCase(address),
      tenants,
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
              <Link key={workOrder.pk + index} href={`/properties/?propertyId=${encodeURIComponent(workOrderId)}`} as={`/properties/?propertyId=${encodeURIComponent(workOrderId)}`}>
                {tData}
              </Link>
            </td>
          );
        })}
      </tr>
    );
  });


  const handleSortingChange = (accessor: keyof IProperty) => {
    const sortOrder =
      accessor === sortField && order === "asc" ? "desc" : "asc";
    setSortField(accessor);
    setOrder(sortOrder);
    handleSorting(accessor, sortOrder);
  };


  return (
    <div className="mt-8">
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