import { WorkOrdersTable } from '@/components/work-orders-table';
import { PortalLeftPanel } from '@/components/portal-left-panel';
import WorkOrder from '@/components/work-order';
import Modal from "react-modal";
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useDevice } from '@/hooks/use-window-size';
import { BottomNavigationPanel } from '@/components/bottom-navigation-panel';
import WorkOrdersCards from '@/components/work-orders-cards';
import { AddWorkOrderModal } from '@/components/add-work-order-modal';


const WorkOrders = () => {
  const router = useRouter();
  const [isBrowser, setIsBrowser] = useState(false);
  const [workOrderModalIsOpen, setWorkOrderModalIsOpen] = useState(false);
  const { isMobile } = useDevice();

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  isBrowser && Modal.setAppElement('#workOrder');

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
              className="mt-2 md:mt-0 bg-blue-200 p-2 mb-auto text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-40 justify-self-end text-center"
              onClick={() => setWorkOrderModalIsOpen(true)}
            >+ New Work Order</button>
          </div>
          {!isMobile && <WorkOrdersTable />}
          {isMobile && <WorkOrdersCards />}
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