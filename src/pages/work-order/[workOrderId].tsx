import WorkOrder from "@/components/work-order";
import { useRouter } from "next/router";

const WorkOrderPage = () => {
  const router = useRouter();
  const { workOrderId } = router.query;
  return <WorkOrder workOrderId={workOrderId as string} />;
};

export default WorkOrderPage;