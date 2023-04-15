import { Data } from "@/database";
import { WorkOrderEntity, WorkOrderStatus } from "@/database/entities/work-order";
import { NextApiRequest, NextApiResponse } from "next";

type UpdateWorkOrderApiRequest = {
  pk: string;
  sk: string;
  status: WorkOrderStatus;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    // TBU
    const body = req.body as UpdateWorkOrderApiRequest;
    const workOrderEntity = new WorkOrderEntity();
    const { pk, sk, status } = body;
    const newWorkOrder = await workOrderEntity.update({
      pk,
      sk,
      status
    });
    return res.status(200).json({ response: JSON.stringify(newWorkOrder) });;

  } catch (error) {
    console.log({ error });
  }
}