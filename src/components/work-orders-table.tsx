import { IWorkOrder } from '@/database/entities/work-order';
import { generateAddressKey, setToShortenedString, toTitleCase } from '@/utils';
import { AiOutlineCheck } from 'react-icons/ai';
import { v4 as uuid } from 'uuid';
import Link from 'next/link';
import { WO_STATUS } from '@/constants';
import { GoTasklist } from 'react-icons/go';
import { StatusOption } from '@/types';
import { LoadingSpinner } from '@/components/loading-spinner';
import Select from 'react-select';
import { HandleUpdateStatusProps } from '@/pages/work-orders';
import { useUserContext } from '@/context/user';
import { USER_TYPE } from '@/database/entities/user';
import { useDocument } from '@/hooks/use-document';

export const StatusOptions: StatusOption[] = [
  { value: WO_STATUS.TO_DO, label: 'To Do', icon: <GoTasklist className="text-primary-content" /> },
  {
    value: WO_STATUS.COMPLETE,
    label: 'Complete',
    icon: <AiOutlineCheck className="text-primary-content" />,
  },
];

interface IWorkOrdersTableProps {
  workOrders: IWorkOrder[];
  isFetching: boolean;
  handleUpdateStatus: ({ val, pk, sk }: HandleUpdateStatusProps) => Promise<void>;
  formattedStatusOptions: ({ value, label, icon }: { value: string; label: string; icon: any }) => JSX.Element;
}

export const WorkOrdersTable = ({ workOrders, isFetching, handleUpdateStatus, formattedStatusOptions }: IWorkOrdersTableProps) => {
  const { userType } = useUserContext();
  const { clientDocument } = useDocument();
  const columns: { label: string; accessor: keyof IWorkOrder }[] = [
    { label: 'Issue', accessor: 'issue' },
    { label: 'Status', accessor: 'status' },
    { label: 'Address', accessor: 'address' },
    { label: 'Assigned To', accessor: 'assignedTo' },
    { label: 'Created', accessor: 'created' },
    { label: 'Tenant', accessor: 'tenantName' },
  ];

  const renderWoCardStatus = (workOrder: IWorkOrder) => {
    if (workOrder.status === WO_STATUS.DELETED) {
      return <p className="text-error ml-1">{WO_STATUS.DELETED}</p>;
    }
    if (userType === USER_TYPE.TENANT) {
      const index = workOrder.status === WO_STATUS.TO_DO ? 0 : 1;
      return (
        <div className={`${workOrder.status === WO_STATUS.TO_DO ? 'badge-warning' : 'badge-success'} badge`}>
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
        className={`cursor-pointer rounded p-1 min-w-max ${workOrder.status === WO_STATUS.TO_DO && 'bg-warning'} ${workOrder.status === WO_STATUS.COMPLETE && 'bg-success'}`}
        value={StatusOptions.find((o) => o.value === workOrder.status)!}
        onChange={(val) => handleUpdateStatus({ val: val, pk: workOrder.pk, sk: workOrder.sk })}
        formatOptionLabel={formattedStatusOptions}
        options={StatusOptions}
        menuPortalTarget={clientDocument?.body}
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
                  <td className={`border-t border-b px-4 py-1 ${accessor === 'assignedTo' && 'whitespace-nowrap w-max'}`} key={accessor}>
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
    <div className="mb-2">
      <div className="border-collapse">
        {remappedWorkOrders.length > 0 ? (
          <table className={`table table${isFetching && 'opacity-50 pointer-events-none'}`}>
            <thead className="">
              <tr className="text-left">
                {columns.map(({ label, accessor }) => {
                  return (
                    <th className={`font-normal px-4`} key={accessor}>
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="">{sortedWorkOrderTable}</tbody>
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
