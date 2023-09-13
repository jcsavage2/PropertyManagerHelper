import { deconstructKey, setToShortenedString, toTitleCase } from '@/utils';
import { IWorkOrder } from '@/database/entities/work-order';
import { useState } from 'react';
import Link from 'next/link';
import Select from 'react-select';
import { BiCheckbox, BiCheckboxChecked } from 'react-icons/bi';
import { PTE, STATUS, Status } from '@/constants';
import { StatusOptions } from './work-orders-table';
import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';
import { HandleUpdateStatusProps } from '../pages/work-orders';
import { MdOutlineKeyboardDoubleArrowDown, MdOutlineKeyboardDoubleArrowUp } from 'react-icons/md';

interface IWorkOrdersCardsProps {
  workOrders: IWorkOrder[];
  handleUpdateStatus: ({ val, pk, sk }: HandleUpdateStatusProps) => Promise<void>;
  isFetching: boolean;
  formattedStatusOptions: ({ value, label, icon }: { value: string; label: string; icon: any }) => JSX.Element;
  statusFilter: Record<Status, boolean>;
  setStatusFilter: (statusFilter: Record<Status, boolean>) => void;
}

export const WorkOrdersCards = ({
  workOrders,
  isFetching,
  handleUpdateStatus,
  formattedStatusOptions,
  statusFilter,
  setStatusFilter,
}: IWorkOrdersCardsProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className={`mt-4 pb-24`}>
      <div className="w-full mb-4 flex flex-col">
        <div
          className={`text-gray-600 w-3/5 flex flex-row px-2 h-9 items-center justify-center bg-blue-200 rounded ${filtersOpen && 'w-3/5'} ${
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
          <div className={`flex flex-row items-center h-8 w-3/5 ${statusFilter.TO_DO ? 'hover:bg-blue-200' : 'hover:bg-gray-200'} px-4`}>
            <p
              className={`cursor-pointer w-full rounded`}
              onClick={() => {
                if (isFetching) return;
                setStatusFilter({ ...statusFilter, TO_DO: !statusFilter.TO_DO });
              }}
            >
              To Do
            </p>
            {!statusFilter.TO_DO ? (
              <BiCheckbox className="mr-3 justify-self-end text-3xl" />
            ) : (
              <BiCheckboxChecked className="mr-3 justify-self-end text-3xl" />
            )}
          </div>

          <div className={`flex flex-row items-center h-8 w-3/5 ${statusFilter.COMPLETE ? 'hover:bg-blue-200' : 'hover:bg-gray-200'} px-4`}>
            <p
              className={`cursor-pointer flex items-center w-full rounded ${statusFilter.COMPLETE ? 'hover:bg-blue-200' : 'hover:bg-gray-200'}`}
              onClick={() => {
                if (isFetching) return;
                setStatusFilter({ ...statusFilter, COMPLETE: !statusFilter.COMPLETE });
              }}
            >
              Complete
            </p>
            {!statusFilter.COMPLETE ? (
              <BiCheckbox className="mr-3 justify-self-end text-3xl" />
            ) : (
              <BiCheckboxChecked className="mr-3 justify-self-end text-3xl" />
            )}
          </div>
        </div>
      </div>
      <div className={`grid gap-y-3 ${isFetching && 'opacity-50'}`}>
        {workOrders.length > 0
          ? workOrders?.map((workOrder, index) => {
              const { assignedTo } = workOrder;
              const assignedToString = setToShortenedString(assignedTo);
              return (
                <div
                  className="py-4 px-3 bg-gray-100 rounded w-full shadow-[0px_1px_5px_0px_rgba(0,0,0,0.3)]"
                  key={`${workOrder.pk}-${workOrder.sk}-${index}`}
                >
                  <p className="text-lg text-gray-800 ml-1 mb-1.5">{toTitleCase(workOrder.issue)} </p>

                  {workOrder.status !== STATUS.DELETED ? (
                    <Select
                      className={`
                    cursor-pointer
                    rounded 
                    p-1 
                    w-48
                    ${workOrder.status === STATUS.TO_DO ? 'bg-yellow-200' : 'bg-green-200'} 
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
                  ) : (
                    <p className="text-red-600 ml-1">{STATUS.DELETED}</p>
                  )}
                  <p className="ml-1 text-base mt-2 font-light">{workOrder.address.address + ' ' + (workOrder?.address?.unit ?? '')} </p>
                  <div className="ml-1 text-sm mt-1 flex flex-row">
                    Tenant: <p className="font-light ml-1">{workOrder.tenantEmail}</p>
                  </div>
                  <div className="ml-1 text-sm mt-0.5 flex flex-row">
                    Assigned To:{' '}
                    {assignedToString === 'Unassigned' ? (
                      <p className="font-light ml-1 text-red-500">Unassigned</p>
                    ) : (
                      <p className="font-light ml-1">{assignedToString}</p>
                    )}
                  </div>
                  <div className="flex flex-row items-center justify-between">
                    <div className="ml-1 text-sm flex flex-row">
                      Permission To Enter:{' '}
                      <p className={`font-light ml-1 ${workOrder.permissionToEnter === PTE.NO ? 'text-red-500' : 'text-green-600'}`}>
                        {workOrder.permissionToEnter}
                      </p>
                    </div>
                    <Link
                      className="px-4 py-1 -mt-2 bg-slate-500 text-slate-100 rounded"
                      key={workOrder.pk + index}
                      href={`/work-orders/?workOrderId=${encodeURIComponent(workOrder.pk)}`}
                      as={`/work-orders/?workOrderId=${encodeURIComponent(workOrder.pk)}`}
                    >
                      Open Details
                    </Link>
                  </div>
                </div>
              );
            })
          : !isFetching && <div className="text-center font-bold">Sorry, no work orders found.</div>}
        {isFetching && (
          <div className="mt-8">
            <LoadingSpinner spinnerClass="spinner-large" />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkOrdersCards;
