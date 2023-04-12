import Image from 'next/image';
import { useUserContext } from "@/context/user";
import Link from 'next/link';
import { CiLocationOn } from "react-icons/ci";
import { RiFilePaper2Fill } from "react-icons/ri";
import { BsFillPersonFill } from "react-icons/bs";
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import axios from "axios";
import { IWorkOrder } from '@/database/entities/work-order';
import { WorkOrdersTable } from './work-orders-table';
import { PortalLeftPanel } from '@/components/portal-left-panel';

const WorkOrders = () => {
  const { user } = useUserContext();
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<Array<IWorkOrder>>([]);

  useEffect(() => {
    async function get() {
      const { data } = await axios.post("/api/get-all-work-orders-for-pm", { propertyManagerEmail: user.pmEmail });
      const orders = JSON.parse(data.response);
      if (orders.length) {
        setWorkOrders(orders);
      }

    }
    get();
  }, [user.pmEmail]);

  const handleSortStatus = useCallback(() => {
    console.log({ workOrders });
    const sorted = workOrders?.sort((a, b) => a.status < b.status ? -1 : 1);
    setWorkOrders(sorted);
  }, [workOrders]);

  return (
    <div id="testing" className="mx-4 mt-4" style={{ display: "grid", gridTemplateColumns: "1fr 3fr", columnGap: "2rem" }}>
      <PortalLeftPanel />
      <div className="lg:max-w-4xl">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <h1 className="text-4xl">{`Work Orders`}</h1>
          <button
            className="bg-blue-200 p-2 mb-auto text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-40 justify-self-end text-center"
          >+ New Work Order</button>
        </div>
        <WorkOrdersTable workOrders={workOrders} handleSortStatus={handleSortStatus} />
      </div>
    </div>
  );
};

export default WorkOrders;