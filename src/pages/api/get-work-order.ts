import { Data } from "@/database";
import { WorkOrderEntity } from "@/database/entities/work-order";
import { NextApiRequest, NextApiResponse } from "next";


export type GetWorkOrder = {
  pk: string;
  sk: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetWorkOrder;
    const { pk, sk } = body;
    if (!pk || !sk) {
      return res.status(400).json({ response: "Missing PK or SK" });
    }
    const workOrderEntity = new WorkOrderEntity();
    const workOrder = await workOrderEntity.get({ pk, sk });
    return res.status(200).json({ response: JSON.stringify(workOrder) });
  } catch (error) {
    console.error(error);
  }
}