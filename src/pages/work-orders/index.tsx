// External dependencies
import axios from 'axios';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import WorkOrderModal from '@/components/modals/work-order';
import { CreateWorkOrderModal } from '@/components/modals/create-work-order';
import { useDevice } from '@/hooks/use-window-size';
import { useUserContext } from '@/context/user';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { IWorkOrder } from '@/database/entities/work-order';
import { renderToastError } from '@/utils';
import { ENTITIES, StartKey } from '@/database/entities';
import { SingleValue } from 'react-select';
import { StatusOption, UpdateWorkOrder, WoStatus } from '@/types';
import WorkOrdersCards from '@/components/work-orders-cards';
import WorkOrdersTable from '@/components/work-orders-table';
import CheckboxDropdown from '@/components/dropdowns/checkbox-dropdown';
import AdminPortal from '@/components/layouts/admin-portal';
import LoadMore from '@/components/load-more';

export type HandleUpdateStatusProps = {
  val: SingleValue<StatusOption>;
  pk: string;
  sk: string;
};

const WorkOrders = () => {
  const { isMobile } = useDevice();
  const { userType, altName } = useUserContext();
  const router = useRouter();
  const { user } = useSessionUser();
  const [orgMode, setOrgMode] = useState<boolean>(false);

  const [isFetching, setIsFetching] = useState(true);
  const [workOrders, setWorkOrders] = useState<IWorkOrder[]>([]);
  const [startKey, setStartKey] = useState<StartKey | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<Record<WoStatus, boolean>>({
    TO_DO: true,
    COMPLETE: true,
  });

  /** Update db and cached WO status */
  const handleUpdateStatus = async ({ val, pk, sk }: HandleUpdateStatusProps) => {
    setIsFetching(true);
    try {
      const { data } = await axios.post('/api/update/work-order', {
        pk,
        sk,
        status: val?.value,
        email: user?.email,
        name: altName ?? user?.name,
      } as UpdateWorkOrder);
      const updatedWorkOrder = JSON.parse(data.response);
      if (updatedWorkOrder) {
        setWorkOrders(workOrders.map((wo) => (wo.pk === updatedWorkOrder.pk ? updatedWorkOrder : wo)));
      }
    } catch (e: any) {
      console.log(e);
      renderToastError(e, 'Error updating work order status');
    }
    setIsFetching(false);
  };

  /** Fetch Work Orders For User Type */
  const fetchWorkOrders = useCallback(
    async (initialFetch: boolean) => {
      if (router.query.workOrderId || !user || !userType) return;
      setIsFetching(true);
      try {
        const { data } = await axios.post('/api/get-all-work-orders-for-user', {
          email: user.email,
          userType,
          orgId: orgMode ? user?.organization ?? '' : undefined,
          startKey: initialFetch ? undefined : startKey,
          statusFilter,
        });

        const response = JSON.parse(data.response);
        const orders: IWorkOrder[] = response.workOrders;
        setStartKey(response.startKey);
        initialFetch ? setWorkOrders(orders) : setWorkOrders((prev) => [...prev, ...orders]);
        if (orders.length) {
          sessionStorage.setItem('WORK_ORDERS', JSON.stringify({ orders, time: Date.now() }));
        }
      } catch (error) {
        renderToastError(error, 'Failed to get work orders for user');
      }
      setIsFetching(false);
    },
    [router.query.workOrderId, user, userType, orgMode, startKey, statusFilter]
  );

  /**
   * If any of the dependencies change, we need to fetch the initial page of work orders again and retrieve a new start key
   */
  useEffect(() => {
    fetchWorkOrders(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router.query.workOrderId, orgMode, statusFilter, userType]);

  const closeWOModalRefetch = () => {
    router.push('/work-orders');
    fetchWorkOrders(true);
  };

  const formattedStatusOptions = ({ value, label, icon }: { value: string; label: string; icon: any }) => (
    <div className="flex flex-row items-center">
      {icon}
      <span className="ml-1 text-sm">{label}</span>
    </div>
  );

  return (
    <AdminPortal id="workOrders" isLoading={!user || !userType}>
      <WorkOrderModal
        isOpen={!!router.query.workOrderId}
        workOrderId={router.query.workOrderId as string}
        afterDelete={() => fetchWorkOrders(true)}
        onClose={closeWOModalRefetch}
      />
      <div className="flex flex-row justify-between items-center mb-2">
        <h1 className="text-4xl">{`Work Orders`}</h1>
        {userType === ENTITIES.PROPERTY_MANAGER ? (
          <CreateWorkOrderModal
            onSuccessfulAdd={() => {
              fetchWorkOrders(true);
            }}
          />
        ) : null}
      </div>
      {user && userType !== ENTITIES.TENANT && (
        <ul className={`w-max menu menu-horizontal bg-base-200 rounded-box ${isFetching && 'pointer-events-none opacity-20'}`}>
          <li>
            <a
              className={`tooltip ${!orgMode ? ' bg-secondary' : 'bg-primary'}`}
              data-tip="Load work orders created by or assigned to me"
              onClick={() => {
                if (isFetching) return;
                setOrgMode(false);
              }}
            >
              {userType === ENTITIES.TECHNICIAN ? 'Assigned to me' : 'My work orders'}
            </a>
          </li>
          <li>
            <a
              className={`tooltip ${orgMode ? 'bg-secondary' : 'bg-primary]'}`}
              data-tip={`Load work orders for ${user?.organizationName || 'my org'}`}
              onClick={() => {
                if (isFetching) return;
                setOrgMode(true);
              }}
            >
              {isMobile ? `All work orders` : `All ${user?.organizationName || 'org'} work orders`}
            </a>
          </li>
        </ul>
      )}
      <div className={`${isFetching ? 'pointer-events-none opacity-20' : ''}`}>
        <CheckboxDropdown
          dropdownLabel="Status"
          options={[
            { label: 'To Do', value: 'TO_DO' },
            { label: 'Complete', value: 'COMPLETE' },
          ]}
          selectedOptions={statusFilter}
          setSelectedOptions={setStatusFilter}
        />
      </div>
      {isMobile ? (
        <WorkOrdersCards workOrders={workOrders} isFetching={isFetching} handleUpdateStatus={handleUpdateStatus} formattedStatusOptions={formattedStatusOptions} />
      ) : (
        <WorkOrdersTable workOrders={workOrders} isFetching={isFetching} handleUpdateStatus={handleUpdateStatus} formattedStatusOptions={formattedStatusOptions} />
      )}
      <div className="w-full mb-10 flex items-center justify-center">
        <LoadMore isDisabled={isFetching} isVisible={workOrders.length && startKey && !isFetching} onClick={() => fetchWorkOrders(false)} />
      </div>
    </AdminPortal>
  );
};

export default WorkOrders;
