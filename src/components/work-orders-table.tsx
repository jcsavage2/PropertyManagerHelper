import { IWorkOrder } from '@/database/entities/work-order';
import { generateAddressKey, setToShortenedString, toTitleCase } from '@/utils';
import { AiOutlineCheck } from 'react-icons/ai';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { BiCheckbox, BiCheckboxChecked } from 'react-icons/bi';
import Link from 'next/link';
import { WO_STATUS } from '@/constants';
import { GoTasklist } from 'react-icons/go';
import { WoStatus, StatusOption } from '@/types';
import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';
import Select from 'react-select';
import { HandleUpdateStatusProps } from '@/pages/work-orders';
import { useUserContext } from '@/context/user';
import { USER_TYPE } from '@/database/entities/user';

export const StatusOptions: StatusOption[] = [
  { value: WO_STATUS.TO_DO, label: 'To Do', icon: <GoTasklist className="text-gray-500" /> },
  {
    value: WO_STATUS.COMPLETE,
    label: 'Complete',
    icon: <AiOutlineCheck className="text-green-500" />,
  },
];

interface IWorkOrdersTableProps {
  workOrders: IWorkOrder[];
  isFetching: boolean;
  statusFilter: Record<WoStatus, boolean>;
  setStatusFilter: (statusFilter: Record<WoStatus, boolean>) => void;
  handleUpdateStatus: ({ val, pk, sk }: HandleUpdateStatusProps) => Promise<void>;
  formattedStatusOptions: ({
    value,
    label,
    icon,
  }: {
    value: string;
    label: string;
    icon: any;
  }) => JSX.Element;
}

export const WorkOrdersTable = ({
  workOrders,
  isFetching,
  statusFilter,
  setStatusFilter,
  handleUpdateStatus,
  formattedStatusOptions,
}: IWorkOrdersTableProps) => {
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const { userType } = useUserContext();
  const columns: { label: string; accessor: keyof IWorkOrder; width: string }[] = [
    { label: 'Issue', accessor: 'issue', width: 'w-72' },
    { label: 'Status', accessor: 'status', width: 'w-44' },
    { label: 'Address', accessor: 'address', width: 'w-44' },
    { label: 'Assigned To', accessor: 'assignedTo', width: 'w-32' },
    { label: 'Created', accessor: 'created', width: '' },
    { label: 'Tenant', accessor: 'tenantName', width: '' },
  ];

  const renderWoCardStatus = (workOrder: IWorkOrder) => {
    if (workOrder.status === WO_STATUS.DELETED) {
      return <p className="text-red-600 ml-1">{WO_STATUS.DELETED}</p>;
    }
    if (userType === USER_TYPE.TENANT) {
      const index = workOrder.status === WO_STATUS.TO_DO ? 0 : 1;
      return (
        <div
          className={`${
            workOrder.status === WO_STATUS.TO_DO ? 'bg-yellow-200 ' : 'bg-green-200'
          } px-2 py-1 rounded-lg`}
        >
          {formattedStatusOptions({
            value: StatusOptions[index].value,
            label: StatusOptions[index].label,
            icon: StatusOptions[index].icon,
          })}
        </div>
      );
    }
    return (
      <Select
        className={`cursor-pointer rounded p-1 min-w-max ${
          workOrder.status === WO_STATUS.TO_DO && 'bg-yellow-200'
        } ${workOrder.status === WO_STATUS.COMPLETE && 'bg-green-200'}`}
        value={StatusOptions.find((o) => o.value === workOrder.status)!}
        onChange={(val) => handleUpdateStatus({ val: val, pk: workOrder.pk, sk: workOrder.sk })}
        formatOptionLabel={formattedStatusOptions}
        options={StatusOptions}
        menuPortalTarget={document.body}
      />
    );
  };

  const remappedWorkOrders =
    workOrders && workOrders.length
      ? workOrders.map((wo) => {
          const { address, tenantEmail, created, tenantName, permissionToEnter, assignedTo } = wo;
          const date = new Date(created);
          const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
          const addressString = generateAddressKey({
            address: address?.address,
            unit: wo?.address?.unit ?? '',
          });
          const assignedToString = setToShortenedString(assignedTo);
          return {
            pk: wo.pk,
            sk: wo.sk,
            issue: toTitleCase(wo.issue),
            tenantEmail,
            status: wo.status,
            address: addressString,
            created: formattedDate,
            tenantName: toTitleCase(tenantName),
            assignedTo: assignedToString,
            permissionToEnter,
          };
        })
      : [];

  const sortedWorkOrderTable =
    remappedWorkOrders && remappedWorkOrders.length
      ? remappedWorkOrders.map((workOrder): any => {
          return (
            <tr key={uuid()} className="h-20">
              {columns.map(({ accessor }, index) => {
                const workOrderId = `${workOrder.pk}`;
                //@ts-ignore
                const tData = workOrder[accessor];
                if (accessor === 'status') {
                  return (
                    <td key={accessor} className="border-t border-b">
                      {/* @ts-ignore */}
                      {renderWoCardStatus(workOrder)}
                    </td>
                  );
                }
                return (
                  <td
                    className={`border-t border-b px-4 py-1 ${
                      accessor === 'assignedTo' && 'whitespace-nowrap w-max'
                    }`}
                    key={accessor}
                  >
                    <Link
                      key={workOrder.pk + index}
                      href={`/work-orders/?workOrderId=${encodeURIComponent(workOrderId)}`}
                      as={`/work-orders/?workOrderId=${encodeURIComponent(workOrderId)}`}
                    >
                      {accessor === 'address' ? toTitleCase(tData) : tData}
                    </Link>
                  </td>
                );
              })}
            </tr>
          );
        })
      : [];

  return (
    <div className="z-1 mb-2">
      <div className={`flex flex-row w-full items-center ${isFetching && 'pointer-events-none'}`}>
        <div>
          <button
            className={`${isFetching && 'opacity-50'} h-full mr-2 px-3 py-2 rounded ${
              !statusFilter.TO_DO || !statusFilter.COMPLETE ? 'bg-blue-200' : 'bg-gray-200'
            }`}
            onClick={() => setShowStatusFilter((s) => !s)}
          >
            Status
          </button>
          {showStatusFilter && (
            <div className="absolute opacity-100 z-10 rounded bg-white p-5 mt-1 w-52 shadow-[0px_10px_20px_2px_rgba(0,0,0,0.3)] grid grid-cols-1 gap-y-4">
              <div
                className={`flex ${statusFilter.TO_DO ? 'hover:bg-blue-200' : 'hover:bg-gray-200'}`}
                onClick={() => {
                  if (isFetching) return;
                  setStatusFilter({ ...statusFilter, TO_DO: !statusFilter.TO_DO });
                }}
              >
                <p className={`py-1 px-3 cursor-pointer flex w-full rounded`}>To Do</p>
                {!statusFilter.TO_DO ? (
                  <BiCheckbox className="mr-3 justify-self-end my-auto flex-end" size={'1.5em'} />
                ) : (
                  <BiCheckboxChecked
                    className="mr-3 justify-self-end my-auto flex-end"
                    size={'1.5em'}
                  />
                )}
              </div>

              <div
                className={`flex ${
                  statusFilter.COMPLETE ? 'hover:bg-blue-200' : 'hover:bg-gray-200'
                }`}
                onClick={() => {
                  if (isFetching) return;
                  setStatusFilter({ ...statusFilter, COMPLETE: !statusFilter.COMPLETE });
                }}
              >
                <p
                  className={`py-1 px-3 cursor-pointer flex w-full rounded ${
                    statusFilter.COMPLETE ? 'hover:bg-blue-200' : 'hover:bg-gray-200'
                  }`}
                >
                  Complete
                </p>
                {!statusFilter.COMPLETE ? (
                  <BiCheckbox className="mr-3 justify-self-end my-auto flex-end" size={'1.5em'} />
                ) : (
                  <BiCheckboxChecked
                    className="mr-3 justify-self-end my-auto flex-end"
                    size={'1.5em'}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-collapse mt-2">
        {remappedWorkOrders.length > 0 ? (
          <table
            className={`w-full border-spacing-x-10 table-auto ${
              isFetching && 'opacity-25 pointer-events-none'
            }`}
          >
            <thead className="">
              <tr className="text-left text-gray-400">
                {columns.map(({ label, accessor, width }) => {
                  return (
                    <th className={`font-normal px-4 ${width}`} key={accessor}>
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="text-gray-700">{sortedWorkOrderTable}</tbody>
          </table>
        ) : (
          !isFetching && <div className="text-center font-bold">Sorry, no work orders found.</div>
        )}
        {isFetching && (
          <div className="mt-8">
            <LoadingSpinner containerClass="h-20" spinnerClass="spinner-large" />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkOrdersTable;
