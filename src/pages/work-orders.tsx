import { WorkOrdersTable } from '@/components/work-orders-table';
import { PortalLeftPanel } from '@/components/portal-left-panel';
import WorkOrder from '@/components/work-order';
import axios from 'axios';
import Modal from "react-modal";
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { useDevice } from '@/hooks/use-window-size';
import { BottomNavigationPanel } from '@/components/bottom-navigation-panel';
import WorkOrdersCards from '@/components/work-orders-cards';
import { AddWorkOrderModal } from '@/components/add-work-order-modal';
import { IWorkOrder } from '@/database/entities/work-order';
import { useUserContext } from '@/context/user';
import { useSessionUser } from '@/hooks/auth/use-session-user';


const WorkOrders = () => {
  const [isBrowser, setIsBrowser] = useState(false);
  const [workOrderModalIsOpen, setWorkOrderModalIsOpen] = useState(false);
  const { isMobile } = useDevice();
  const { userType } = useUserContext();
  const router = useRouter();
  const { user } = useSessionUser();

  const [isFetching, setIsFetching] = useState(false);
  const [workOrders, setWorkOrders] = useState<IWorkOrder[]>([]);


  /** Work Order Modal Logic */
  isBrowser && Modal.setAppElement('#workOrder');
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  /** Fetch Work Orders For User Type */
  const fetchWorkOrders = useCallback(async () => {
    if (isFetching || (!userType) || !user) return;

    setIsFetching(true);
    const promise = userType === "PROPERTY_MANAGER"
      ? axios.post('/api/get-all-work-orders-for-pm', { pmEmail: user.email })
      : userType === "TECHNICIAN"
        ? axios.post('/api/get-all-work-orders-for-technician', { technicianEmail: user.email })
        : axios.post('/api/get-all-work-orders-for-tenant', { tenantEmail: user.email });

    const { data } = await promise;
    const orders: IWorkOrder[] = JSON.parse(data.response);
    if (orders.length) {
      sessionStorage.setItem('WORK_ORDERS', JSON.stringify({ orders, time: Date.now() }));
      setWorkOrders(orders);
    }

    setIsFetching(false);
  }, [isFetching, user, userType]);

  useEffect(() => {
    fetchWorkOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <>
      <Modal
        isOpen={!!router.query.workOrderId}
        onRequestClose={() => router.push('/work-orders')}
        contentLabel="Post modal"
        closeTimeoutMS={200}
      >
        <WorkOrder workOrderId={router.query.workOrderId as string} />
      </Modal>
      <div id="workOrder" className="mx-4 mt-4" style={isMobile ? {} : { display: "grid", gridTemplateColumns: "1fr 3fr", columnGap: "2rem" }}>
        {!isMobile && <PortalLeftPanel />}
        <div className="lg:max-w-5xl">
          <div style={isMobile ? {} : { display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <h1 className="text-4xl">{`Work Orders`}</h1>
            <button
              className="float-left mt-2 md:mt-0 bg-blue-200 p-2 mb-auto text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-56 justify-self-end text-center"
              onClick={() => setWorkOrderModalIsOpen(true)}
            >+ New Work Order</button>
          </div>
          {!isMobile && <WorkOrdersTable workOrders={workOrders} isFetching={isFetching} fetchWorkOrders={fetchWorkOrders} />}
          {isMobile && <WorkOrdersCards workOrders={workOrders} isFetching={isFetching} fetchWorkOrders={fetchWorkOrders} />}
          <AddWorkOrderModal
            workOrderModalIsOpen={workOrderModalIsOpen}
            setWorkOrderModalIsOpen={setWorkOrderModalIsOpen}
            onSuccessfulAdd={() => console.log("done...")}
          />
          {isMobile && <BottomNavigationPanel />}
        </div>
      </div>
    </>
  );
};

export default WorkOrders;