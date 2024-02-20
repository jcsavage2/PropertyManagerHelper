import { getTenantDisplayEmail, setToShortenedString, toTitleCase } from '@/utils';
import { IWorkOrder } from '@/database/entities/work-order';
import Link from 'next/link';
import Select from 'react-select';
import { PTE, WO_STATUS } from '@/constants';
import { StatusOptions } from './work-orders-table';
import { LoadingSpinner } from '@/components/loading-spinner';
import { HandleUpdateStatusProps } from '../pages/work-orders';
import { useUserContext } from '@/context/user';
import { USER_TYPE } from '@/database/entities/user';
import MobileCard from './mobile-card';

interface IWorkOrdersCardsProps {
  workOrders: IWorkOrder[];
  handleUpdateStatus: ({ val, pk, sk }: HandleUpdateStatusProps) => Promise<void>;
  isFetching: boolean;
  formattedStatusOptions: ({ value, label, icon }: { value: string; label: string; icon: any }) => JSX.Element;
}

export const WorkOrdersCards = ({ workOrders, isFetching, handleUpdateStatus, formattedStatusOptions }: IWorkOrdersCardsProps) => {
  const { userType } = useUserContext();

  const renderWoCardStatus = (workOrder: IWorkOrder) => {
    if (workOrder.status === WO_STATUS.DELETED) {
      return <p className="badge badge-error">{WO_STATUS.DELETED}</p>;
    }
    if (userType === USER_TYPE.TENANT) {
      const index = workOrder.status === WO_STATUS.TO_DO ? 0 : 1;
      return (
        <div className={`${workOrder.status === WO_STATUS.TO_DO ? 'bg-warning w-20' : 'bg-success w-24'} px-2 py-1 rounded-lg`}>
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
        className={`
      cursor-pointer
      rounded 
      p-1 
      w-48
      ${workOrder.status === WO_STATUS.TO_DO ? 'bg-warning' : 'bg-success'} 
    `}
        value={StatusOptions.find((o) => o.value === workOrder.status)}
        blurInputOnSelect={false}
        formatOptionLabel={formattedStatusOptions}
        onChange={(v) => {
          if (v) {
            //@ts-ignore
            handleUpdateStatus({ pk: workOrder.pk, sk: workOrder.sk, val: v });
          }
        }}
        options={StatusOptions}
        isDisabled={isFetching}
      />
    );
  };

  return (
    <div className={`mt-1 mb-4`}>
      <div className={`${isFetching && 'opacity-50'}`}>
        {workOrders.length ? (
          <p className="text-sm place-self-start font-light italic mb-1 ml-2 mt-1">
            {'Showing ' + workOrders.length} {workOrders.length === 1 ? ' work order...' : ' work orders...'}
          </p>
        ) : null}
        {workOrders.length > 0
          ? workOrders?.map((workOrder, index) => {
              const { assignedTo } = workOrder;
              const assignedToString = setToShortenedString(assignedTo);
              const correctedEmail = getTenantDisplayEmail(workOrder.tenantEmail, toTitleCase(workOrder.tenantName));
              return (
                <MobileCard title={toTitleCase(workOrder.issue)} key={`${workOrder.pk}-${workOrder.sk}-${index}`}>
                  <div className="text-sm flex flex-col">
                    {renderWoCardStatus(workOrder)}
                    <p className="text-base mt-2 font-light">{workOrder.address.address + ' ' + (workOrder?.address?.unit ?? '')} </p>
                    <div className="flex flex-row mt-1">
                      Tenant: <p className="font-light ml-1">{correctedEmail}</p>
                    </div>
                    <div className="flex flex-row">
                      Assigned To:{' '}
                      {assignedToString === 'Unassigned' ? <p className="font-light ml-1 text-error">Unassigned</p> : <p className="font-light ml-1">{assignedToString}</p>}
                    </div>
                    <div className="flex flex-row">
                      Permission To Enter: <p className={`font-light ml-1 ${workOrder.permissionToEnter === PTE.NO ? 'text-error' : ' '}`}>{workOrder.permissionToEnter}</p>
                    </div>
                    <Link
                      className="btn btn-sm btn-primary w-1/3 place-self-end"
                      key={workOrder.pk + index}
                      href={`/work-orders/?workOrderId=${encodeURIComponent(workOrder.pk)}`}
                      as={`/work-orders/?workOrderId=${encodeURIComponent(workOrder.pk)}`}
                    >
                      Open Details
                    </Link>
                  </div>
                </MobileCard>
              );
            })
          : !isFetching && <div className="text-center font-bold">Sorry, no work orders found.</div>}
        {isFetching && (
          <div className="mt-8">
            <LoadingSpinner containerClass="h-20" spinnerClass="spinner-large" />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkOrdersCards;
