import { Data } from "@/database";
import { IWorkOrder, WorkOrderEntity } from "@/database/entities/work-order";
import { NextApiRequest, NextApiResponse } from "next";

type GetWorkOrdersForTechnicianApiRequest = {
  technicianEmail: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetWorkOrdersForTechnicianApiRequest;
    const workOrderEntity = new WorkOrderEntity();
    const technicianEmail = body.technicianEmail;
    const workOrders = await workOrderEntity.getAllForTechnician({ technicianEmail });
    console.log({ workOrders });
    //@ts-ignore
    const sorted = workOrders?.sort((a: IWorkOrder, b: IWorkOrder) => {
      //@ts-ignore
      return new Date(b.created) - new Date(a.created);
    });

    return res.status(200).json({ response: JSON.stringify(sorted) });;

  } catch (error) {
    console.log({ error });
  }
}