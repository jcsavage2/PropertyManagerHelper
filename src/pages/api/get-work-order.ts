import { Data } from "@/database";
import { WorkOrderEntity } from "@/database/entities/work-order";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { options } from "./auth/[...nextauth]";


export type GetWorkOrder = {
  pk: string;
  sk: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as GetWorkOrder;
    const { pk, sk } = body;
    if (!pk || !sk) {
      return res.status(400).json({ response: "Missing PK or SK" });
    }
    const workOrderEntity = new WorkOrderEntity();
    const workOrder = await workOrderEntity.get({ pk, sk });
    return res.status(200).json({ response: JSON.stringify(workOrder.Item) });
  } catch (error) {
    console.error(error);
  }
}