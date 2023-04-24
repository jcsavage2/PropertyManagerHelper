import { IWorkOrder } from "@/database/entities/work-order";
import axios from "axios";
import { useEffect, useState } from "react";


const WorkOrder = ({ workOrderId }: { workOrderId: string; }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [workOrder, setWorkOrder] = useState<IWorkOrder | null>(null);

  useEffect(() => {
    async function getWorkOrder() {
      try {
        const { data } = await axios.post("/api/get-work-order", { pk: workOrderId, sk: workOrderId });
        if (data.response) {
          const parsed = JSON.parse(data.response);
          setWorkOrder(parsed.Item);
          setIsLoading(false);
        }
      } catch (err) {
        console.error(err);
      }
    }
    getWorkOrder();
  }, [workOrderId]);

  if (workOrder && !isLoading) {
    return (
      <div >
        <div>Issue: {workOrder.issue}</div>
        <div>Status: {workOrder.status}</div>
        <div></div>
        <div></div>
      </div >
    );
  }
  if (isLoading) {
    return <div>loading...</div>;
  }
  return (
    <div >
      <div>None</div>
    </div >
  );
};

export default WorkOrder;