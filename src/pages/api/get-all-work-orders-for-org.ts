import { Data } from "@/database";
import { IWorkOrder, WorkOrderEntity } from "@/database/entities/work-order";
import { NextApiRequest, NextApiResponse } from "next";

type GetWorkOrdersForPropertyManagerApiRequest = {
  orgId: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetWorkOrdersForPropertyManagerApiRequest;
    const workOrderEntity = new WorkOrderEntity();
    const orgId = body.orgId;
    const workOrders = await workOrderEntity.getAllForOrg({ orgId });
    const sorted = workOrders?.sort((a: IWorkOrder, b: IWorkOrder) => {
      //@ts-ignore
      return new Date(b.created) - new Date(a.created);
    });

    return res.status(200).json({ response: JSON.stringify(sorted) });;

  } catch (error) {
    console.log({ error });
  }
}