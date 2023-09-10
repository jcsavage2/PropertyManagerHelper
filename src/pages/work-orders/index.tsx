// External dependencies
import axios from 'axios';
import Modal from 'react-modal';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

// Local components
import { PortalLeftPanel } from '@/components/portal-left-panel';
import WorkOrder from '@/components/work-order';
import { BottomNavigationPanel } from '@/components/bottom-navigation-panel';
import { AddWorkOrderModal } from '@/components/add-work-order-modal';

// Hooks and context
import { useDevice } from '@/hooks/use-window-size';
import { useUserContext } from '@/context/user';
import { useSessionUser } from '@/hooks/auth/use-session-user';

// Types
import { IGetAllWorkOrdersForUserProps, IWorkOrder } from '@/database/entities/work-order';
import { deconstructKey, getPageLayout } from '@/utils';
import { ENTITIES, StartKey } from '@/database/entities';
import { SingleValue } from 'react-select';
import { StatusOptionType } from '@/types';
import { Status } from '@/constants';
import WorkOrdersCards from '@/components/work-orders-cards';
import WorkOrdersTable from '@/components/work-orders-table';

export type HandleUpdateStatusProps = {
  val: SingleValue<StatusOptionType>;
  pk: string;
  sk: string;
};

const WorkOrders = () => {
  const [isBrowser, setIsBrowser] = useState(false);
  const [addWorkOrderModalIsOpen, setAddWorkOrderModalIsOpen] = useState(false);
  const { isMobile } = useDevice();
  const { userType } = useUserContext();
  const router = useRouter();
  const { user } = useSessionUser();
  const [orgMode, setOrgMode] = useState<boolean>(false);

  const [isFetching, setIsFetching] = useState(true);
  const [workOrders, setWorkOrders] = useState<IWorkOrder[]>([]);
  const [startKey, setStartKey] = useState<StartKey | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<Record<Status, boolean>>({
    TO_DO: true,
    COMPLETE: true,
  });

  /** Work Order Modal Logic */
  isBrowser && Modal.setAppElement('#workOrder');
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  /** Update db and cached WO status */
  const handleUpdateStatus = async ({ val, pk, sk }: HandleUpdateStatusProps) => {
    if (!user) return;
    setIsFetching(true);
    const { data } = await axios.post('/api/update-work-order', { pk, sk, status: val?.value, email: user?.email });
    const updatedWorkOrder = JSON.parse(data.response);
    if (updatedWorkOrder) {
      setWorkOrders(workOrders.map((wo) => (wo.pk === updatedWorkOrder.pk ? updatedWorkOrder : wo)));
    }
    setIsFetching(false);
  };

  /** Fetch Work Orders For User Type */
  const fetchWorkOrders = useCallback(
    async (initialFetch: boolean) => {
      if (router.query.workOrderId || !user || !userType) return;
      setIsFetching(true);
      try {
        const body: IGetAllWorkOrdersForUserProps = {
          email: user.email,
          userType,
          orgId: orgMode ? deconstructKey(user?.organization ?? '') : undefined,
          startKey: initialFetch ? undefined : startKey,
          statusFilter,
        };
        const { data } = await axios.post('/api/get-all-work-orders-for-user', { ...body });
        const response = JSON.parse(data.response);
        const orders: IWorkOrder[] = response.workOrders;
        setStartKey(response.startKey);
        initialFetch ? setWorkOrders(orders) : setWorkOrders([...workOrders, ...orders]);
        if (orders.length) {
          sessionStorage.setItem('WORK_ORDERS', JSON.stringify({ orders, time: Date.now() }));
        }
      } catch (e) {
        console.log(e);
      }
      setIsFetching(false);
    },
    [orgMode, user, userType, statusFilter, startKey]
  );

  /**
   * If any of the dependencies change, we need to fetch the initial page of work orders again and retrieve a new start key
   */
  useEffect(() => {
    fetchWorkOrders(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router.query.workOrderId, orgMode, statusFilter]);

  const formattedStatusOptions = ({ value, label, icon }: { value: string; label: string; icon: any }) => (
    <div className="flex flex-row items-center">
      {icon}
      <span className="ml-1 text-sm">{label}</span>
    </div>
  );

  return (
    <>
      <Modal isOpen={!!router.query.workOrderId} onRequestClose={() => router.push('/work-orders')} contentLabel="Post modal" closeTimeoutMS={200}>
        <WorkOrder workOrderId={router.query.workOrderId as string} afterDelete={() => fetchWorkOrders(true)} />
      </Modal>
      <div id="workOrder" className="mx-4 mt-4" style={getPageLayout(isMobile)}>
        {!isMobile && <PortalLeftPanel />}
        <div className={`lg:max-w-5xl`}>
          <div className="flex flex-row justify-between items-center mb-2">
            <h1 className="text-4xl">{`Work Orders`}</h1>
            <button
              className={` bg-blue-200 p-2 mb-2 mt-2 md:mt-0 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-full md:w-56 w-32 text-center ${
                isFetching && 'opacity-50 pointer-events-none'
              }'}`}
              onClick={() => {
                if (isFetching) return;
                setAddWorkOrderModalIsOpen(true);
              }}
            >
              + Work Order
            </button>
          </div>
          {userType !== ENTITIES.TENANT && (
            <div className={`flex flex-row cursor-pointer mb-2 text-slate-700 ${isFetching && 'opacity-50 pointer-events-none '}`}>
              <div
                className={`p-2 px-3 rounded-l border border-slate-300 hover:bg-blue-100 ${!orgMode ? 'bg-blue-300' : 'bg-blue-200'}`}
                onClick={() => {
                  if (isFetching) return;
                  setOrgMode(false);
                }}
              >
                My work orders
              </div>
              <div className={`p-2 px-3 rounded-r border border-l-0 hover:bg-blue-100 ${orgMode ? 'bg-blue-300' : 'bg-blue-200'}`} onClick={() => setOrgMode(true)}>
                All {user?.organizationName || 'org'} work orders
              </div>
            </div>
          )}
          {isMobile ? (
            <WorkOrdersCards
              workOrders={workOrders}
              isFetching={isFetching}
              handleUpdateStatus={handleUpdateStatus}
              formattedStatusOptions={formattedStatusOptions}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />
          ) : (
            <WorkOrdersTable
              workOrders={workOrders}
              isFetching={isFetching}
              handleUpdateStatus={handleUpdateStatus}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              formattedStatusOptions={formattedStatusOptions}
            />
          )}
          {workOrders.length && startKey && !isFetching ? (
            <div className="w-full flex items-center justify-center">
              <button
                disabled={isFetching}
                onClick={() => fetchWorkOrders(false)}
                className="bg-blue-200 mx-auto py-1 w-1/4 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mb-24"
              >
                Load more
              </button>
            </div>
          ) : null}
          <AddWorkOrderModal
            addWorkOrderModalIsOpen={addWorkOrderModalIsOpen}
            setAddWorkOrderModalIsOpen={setAddWorkOrderModalIsOpen}
            onSuccessfulAdd={() => {
              setAddWorkOrderModalIsOpen(false);
              fetchWorkOrders(true);
            }}
          />
          {isMobile && <BottomNavigationPanel />}
        </div>
      </div>
    </>
  );
};

export default WorkOrders;