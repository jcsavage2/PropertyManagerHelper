import { useUserContext } from '@/context/user';
import { IWorkOrder } from '@/database/entities/work-order';
import { createdToFormattedDateTime, deconstructKey, generateAddressKey, setToShortenedString, toTitleCase } from '@/utils';
import axios from 'axios';
import { AiOutlineCheck, AiOutlineFilter, AiOutlineTable } from 'react-icons/ai';
import { useCallback, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { BiCheckbox, BiCheckboxChecked, BiRefresh, BiTimeFive } from 'react-icons/bi';
import Link from 'next/link';
import { STATUS } from '@/constants';
import { GoTasklist } from 'react-icons/go';
import Select, { SingleValue } from 'react-select';
import { StatusOptionType } from '@/types';
import { IoLocationSharp } from 'react-icons/io5';

type HandleUpdateStatusProps = {
  val: SingleValue<StatusOptionType>;
  pk: string;
  sk: string;
};

export const StatusOptions: StatusOptionType[] = [
  { value: STATUS.TO_DO, label: 'To Do', icon: <GoTasklist className="text-gray-500" /> },
  { value: STATUS.COMPLETE, label: 'Complete', icon: <AiOutlineCheck className="text-green-500" /> },
];

interface IWorkOrdersTableProps {
  workOrders: IWorkOrder[];
}

export const WorkOrdersTable = ({ workOrders }: IWorkOrdersTableProps) => {
  const [sortField, setSortField] = useState<string>('status');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [tableView, setTableView] = useState<boolean>(true);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<Record<IWorkOrder['status'], boolean>>({
    TO_DO: true,
    COMPLETE: true,
  });
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const { user } = useUserContext();

  const fetchWorkOrders = useCallback(async () => {
    if (isUpdating || (!user.pmEmail && !user.userType)) {
      return;
    }
  }, [isUpdating, user]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const handleSorting = (sortField: keyof IWorkOrder, sortOrder: 'asc' | 'desc') => {
    if (sortField) {
      const sorted = workOrders.sort((a, b) => {
        return (
          a[sortField].toString().localeCompare(b[sortField].toString(), 'en', {
            numeric: true,
          }) * (sortOrder === 'asc' ? 1 : -1)
        );
      });
      // setWorkOrders(sorted);
    }
  };

  const handleUpdateStatus = async ({ val, pk, sk }: HandleUpdateStatusProps) => {
    setIsUpdating(true);
    const { data } = await axios.post('/api/update-work-order', { pk, sk, status: val?.value, email: deconstructKey(user.pk) });
    const updatedWorkOrder = JSON.parse(data.response);
    if (updatedWorkOrder) {
      const newWorkOrders = workOrders
        .map((wo) => (wo.pk === updatedWorkOrder.pk ? updatedWorkOrder : wo))
        .sort((a, b) => {
          return (
            a[sortField].toString().localeCompare(b[sortField].toString(), 'en', {
              numeric: true,
            }) * (order === 'asc' ? 1 : -1)
          );
        });
      // setWorkOrders(newWorkOrders);
    }
    setIsUpdating(false);
  };

  const columns: { label: string; accessor: keyof IWorkOrder; width: string; }[] = [
    { label: 'Title', accessor: 'issue', width: 'w-72' },
    { label: 'Status', accessor: 'status', width: 'w-48' },
    { label: 'Address', accessor: 'address', width: '' },
    { label: 'Assigned To', accessor: 'assignedTo', width: '' },
    { label: 'Created', accessor: 'created', width: '' },
    { label: 'Created By', accessor: 'tenantName', width: '' },
  ];

  const remappedWorkOrders = workOrders.map((wo) => {
    const { status, address, tenantEmail, created, tenantName, permissionToEnter, assignedTo } = wo;
    const date = new Date(created);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    const addressString = generateAddressKey({ address: address?.address, unit: wo?.address?.unit ?? '' });
    const assignedToString = setToShortenedString(assignedTo);
    return {
      pk: wo.pk,
      sk: wo.sk,
      issue: toTitleCase(wo.issue),
      status,
      tenantEmail,
      address: addressString,
      created: formattedDate,
      tenantName: toTitleCase(tenantName),
      assignedTo: assignedToString,
      permissionToEnter,
    };
  });

  const filteredRows = remappedWorkOrders.filter((w) => !!statusFilter[w.status]);
  const sortedWorkOrderCards = filteredRows.map((workOrder, index: number): any => {
    const workOrderId = deconstructKey(workOrder.pk);
    const formattedDateTime = createdToFormattedDateTime(workOrder.created);
    return (
      <Link
        href={`/work-orders/?workOrderId=${encodeURIComponent(workOrder.pk)}`}
        as={`/work-orders/?workOrderId=${encodeURIComponent(workOrder.pk)}`}
        key={`${workOrder.pk}-${workOrder.sk}-${index}`}>
        <div
          className={`${index !== filteredRows.length && 'mb-3'} ${workOrder.status === STATUS.TO_DO ? 'bg-gray-100' : 'bg-green-50'
            } hover:cursor-pointer ml-4 py-4 px-3 rounded-sm w-11/12 shadow-[0px_1px_5px_0px_rgba(0,0,0,0.3)]`}>
          <div className="flex flex-row text-2xl items-center text-black">
            {toTitleCase(workOrder.issue)} <p className="ml-4 text-sm text-gray-300">#{workOrderId}</p>
          </div>
          <div>
            <div className="mt-1 ml-2 text-base font-light flex flex-row items-center">
              <IoLocationSharp className="mr-2" /> {workOrder.address}{' '}
            </div>
            <div className=" ml-2 text-base font-light flex flex-row items-center">
              <BiTimeFive className="mr-2" /> {formattedDateTime[0]}
            </div>
          </div>

          <p className="ml-2 mt-4 text-sm font-light">Requested by: {workOrder.tenantName} </p>
          <p className="ml-2 text-sm font-light">Assigned to: {workOrder.assignedTo} </p>
          <div className="mt-2 w-1/5">
            {workOrder.status === STATUS.TO_DO ? (
              <div className="flex flex-row p-2 items-center">
                <GoTasklist fontSize={30} />
                <span className="ml-2 text-sm">Todo</span>
              </div>
            ) : (
              <div className="flex flex-row p-2 items-center">
                <AiOutlineCheck fontSize={30} className=" text-green-500" />
                <span className="ml-2 text-sm text-green-500">Complete</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  });

  const formattedStatusOptions = ({ value, label, icon }: { value: string; label: string; icon: any; }) => (
    <div className="flex flex-row items-center">
      {icon}
      <span className="ml-1 text-sm">{label}</span>
    </div>
  );

  const sortedWorkOrderTable = filteredRows.map((workOrder): any => {
    return (
      <tr key={uuid()}>
        {columns.map(({ accessor }, index) => {
          const workOrderId = `${workOrder.pk}`;
          //@ts-ignore
          const tData = workOrder[accessor];
          if (accessor === 'status') {
            return (
              <td key={accessor} className="border px-4 py-1">
                <Select
                  className={`cursor-pointer rounded p-1 min-w-max ${tData === 'TO_DO' && 'bg-yellow-200'} ${tData === 'COMPLETE' && 'bg-green-200'}`}
                  value={StatusOptions.find((o) => o.value === tData)}
                  onChange={(val) => handleUpdateStatus({ val: val, pk: workOrder.pk, sk: workOrder.sk })}
                  formatOptionLabel={formattedStatusOptions}
                  options={StatusOptions}
                />
              </td>
            );
          }
          return (
            <td className={`border px-4 py-1 ${accessor === 'assignedTo' && 'whitespace-nowrap w-max'}`} key={accessor}>
              <Link
                key={workOrder.pk + index}
                href={`/work-orders/?workOrderId=${encodeURIComponent(workOrderId)}`}
                as={`/work-orders/?workOrderId=${encodeURIComponent(workOrderId)}`}>
                {tData}
              </Link>
            </td>
          );
        })}
      </tr>
    );
  });

  const handleSortingChange = (accessor: keyof IWorkOrder) => {
    const sortOrder = accessor === sortField && order === 'asc' ? 'desc' : 'asc';
    setSortField(accessor);
    setOrder(sortOrder);
    handleSorting(accessor, sortOrder);
  };

  return (
    <div className="mt-8">
      <div className="flex flex-row w-full pb-4">
        <div>
          <button
            className={`h-full mr-2 px-3 rounded ${!statusFilter.TO_DO || !statusFilter.COMPLETE ? 'bg-blue-200' : 'bg-gray-200'}`}
            onClick={() => setShowStatusFilter((s) => !s)}>
            Status
          </button>
          {showStatusFilter && (
            <div className="absolute z-10 rounded bg-white p-5 mt-1 w-52 shadow-[0px_10px_20px_2px_rgba(0,0,0,0.3)] grid grid-cols-1 gap-y-4">
              <div className={`flex ${statusFilter.TO_DO ? 'hover:bg-blue-200' : 'hover:bg-gray-200'}`}>
                <p
                  className={`py-1 px-3 cursor-pointer flex w-full rounded`}
                  onClick={() => setStatusFilter({ ...statusFilter, TO_DO: !statusFilter.TO_DO })}>
                  To Do
                </p>
                {!statusFilter.TO_DO ? (
                  <BiCheckbox className="mr-3 justify-self-end my-auto flex-end" size={'1.5em'} />
                ) : (
                  <BiCheckboxChecked className="mr-3 justify-self-end my-auto flex-end" size={'1.5em'} />
                )}
              </div>

              <div className={`flex ${statusFilter.COMPLETE ? 'hover:bg-blue-200' : 'hover:bg-gray-200'}`}>
                <p
                  className={`py-1 px-3 cursor-pointer flex w-full rounded ${statusFilter.COMPLETE ? 'hover:bg-blue-200' : 'hover:bg-gray-200'
                    }`}
                  onClick={() => setStatusFilter({ ...statusFilter, COMPLETE: !statusFilter.COMPLETE })}>
                  Complete
                </p>
                {!statusFilter.COMPLETE ? (
                  <BiCheckbox className="mr-3 justify-self-end my-auto flex-end" size={'1.5em'} />
                ) : (
                  <BiCheckboxChecked className="mr-3 justify-self-end my-auto flex-end" size={'1.5em'} />
                )}
              </div>
            </div>
          )}
        </div>
        <div className="my-auto flex mr-2">
          <AiOutlineFilter className="mr-1 my-auto" />
          Filters
        </div>
        <button
          className={`${tableView ? 'bg-blue-200' : 'bg-gray-200'
            }  ml-auto md:mt-0  p-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 text-center`}
          onClick={() => setTableView(!tableView)}
          disabled={isFetching || isUpdating}>
          <AiOutlineTable className="text-2xl" />
        </button>
        <button
          className="mx-4 md:mt-0 bg-blue-200 p-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 text-center"
          onClick={fetchWorkOrders}
          disabled={isFetching || isUpdating}>
          <BiRefresh className="text-2xl" />
        </button>
      </div>

      <div className="overflow-x-auto mb-8 border-collapse">
        {tableView ? (
          <table className={`w-full border-spacing-x-10 table-auto ${isUpdating || (isFetching && 'opacity-25 pointer-events-none')}`}>
            <thead className="">
              <tr className="text-left text-gray-400">
                {columns.map(({ label, accessor, width }) => {
                  return (
                    <th className={`font-normal px-4 cursor-pointer ${width}`} key={accessor} onClick={() => handleSortingChange(accessor)}>
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="text-gray-700">{sortedWorkOrderTable}</tbody>
          </table>
        ) : (
          <div className={`text-gray-700 pt-1 ${isUpdating || (isFetching && 'opacity-25 pointer-events-none')}`}>
            {sortedWorkOrderCards}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkOrdersTable;
