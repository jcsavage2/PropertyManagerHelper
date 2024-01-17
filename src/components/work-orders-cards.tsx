import { deconstructKey, getTenantDisplayEmail, setToShortenedString, toTitleCase } from '@/utils';
import { IWorkOrder } from '@/database/entities/work-order';
import { useState } from 'react';
import Link from 'next/link';
import Select from 'react-select';
import { BiCheckbox, BiCheckboxChecked } from 'react-icons/bi';
import { NO_EMAIL_PREFIX, PTE, WO_STATUS } from '@/constants';
import { StatusOptions } from './work-orders-table';
import { LoadingSpinner } from '@/components/loading-spinner';
import { HandleUpdateStatusProps } from '../pages/work-orders';
import { MdOutlineKeyboardDoubleArrowDown, MdOutlineKeyboardDoubleArrowUp } from 'react-icons/md';
import { WoStatus } from '@/types';
import { useUserContext } from '@/context/user';
import { USER_TYPE } from '@/database/entities/user';
import MobileCard from './mobile-card';

interface IWorkOrdersCardsProps {
  workOrders: IWorkOrder[];
  handleUpdateStatus: ({ val, pk, sk }: HandleUpdateStatusProps) => Promise<void>;
  isFetching: boolean;
  formattedStatusOptions: ({ value, label, icon }: { value: string; label: string; icon: any }) => JSX.Element;
  statusFilter: Record<WoStatus, boolean>;
  setStatusFilter: (statusFilter: Record<WoStatus, boolean>) => void;
}

export const WorkOrdersCards = ({ workOrders, isFetching, handleUpdateStatus, formattedStatusOptions, statusFilter, setStatusFilter }: IWorkOrdersCardsProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { userType } = useUserContext();

  const renderWoCardStatus = (workOrder: IWorkOrder) => {
    if (workOrder.status === WO_STATUS.DELETED) {
      return <p className="text-error ml-1">{WO_STATUS.DELETED}</p>;
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
    <div className={`mt-4 pb-24 min-h-screen`}>
      <div className="w-full mb-4 flex flex-col">
        <div
          className={`w-3/5 flex flex-row px-2 h-9 items-center justify-center bg-primary rounded ${filtersOpen && 'w-3/5'} ${
            isFetching && 'opacity-50 pointer-events-none'
          }}`}
          onClick={() => {
            if (isFetching) return;
            setFiltersOpen(!filtersOpen);
          }}
        >
          {!filtersOpen ? (
            <>
              <p>Show Filters</p>
              <MdOutlineKeyboardDoubleArrowDown className="text-2xl ml-1" />
            </>
          ) : (
            <>
              <p>Hide Filters</p>
              <MdOutlineKeyboardDoubleArrowUp className="text-2xl ml-1" />
            </>
          )}
        </div>
        <div className={`w-full ${!filtersOpen && 'hidden'} ${isFetching && 'opacity-50 pointer-events-none'} mt-1`}>
          <div
            className={`flex flex-row items-center h-8 w-3/5 px-4 hover:bg-secondary`}
            onClick={() => {
              if (isFetching) return;
              setStatusFilter({ ...statusFilter, TO_DO: !statusFilter.TO_DO });
            }}
          >
            <p className={`cursor-pointer w-full rounded`}>To Do</p>
            {!statusFilter.TO_DO ? <BiCheckbox className="mr-3 justify-self-end text-3xl" /> : <BiCheckboxChecked className="mr-3 justify-self-end text-3xl" />}
          </div>

          <div
            className={`flex flex-row items-center h-8 w-3/5 px-4 hover:bg-secondary`}
            onClick={() => {
              if (isFetching) return;
              setStatusFilter({ ...statusFilter, COMPLETE: !statusFilter.COMPLETE });
            }}
          >
            <p className={`cursor-pointer w-full rounded`}>Complete</p>
            {!statusFilter.COMPLETE ? <BiCheckbox className="mr-3 justify-self-end text-3xl" /> : <BiCheckboxChecked className="mr-3 justify-self-end text-3xl" />}
          </div>
        </div>
      </div>
      <div className={`${isFetching && 'opacity-50'}`}>
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
