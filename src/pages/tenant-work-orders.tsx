import { WorkOrdersTable } from '@/components/work-orders-table';
import { PortalLeftPanel } from '@/components/portal-left-panel';
import WorkOrder from '@/components/work-order';
import Modal from "react-modal";
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useDevice } from '@/hooks/use-window-size';
import { BottomNavigationPanel } from '@/components/bottom-navigation-panel';
import WorkOrdersCards from '@/components/work-orders-cards';


const TenantWorkOrders = () => {
  const router = useRouter();
  const [isBrowser, setIsBrowser] = useState(false);
  const { isMobile } = useDevice();

  /** Work Order Modal Logic */
  isBrowser && Modal.setAppElement('#workOrder');
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  /** Fetch Work Orders For User Type */



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
          </div>
          {!isMobile && <WorkOrdersTable workOrders={workOrders} />}
          {isMobile && <WorkOrdersCards />}
          {isMobile && <BottomNavigationPanel />}
        </div>
      </div>
    </>
  );
};

export default TenantWorkOrders;