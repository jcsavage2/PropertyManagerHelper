import { Data } from "@/database";
import { IGetAllWorkOrdersForUserProps, IWorkOrder, WorkOrderEntity } from "@/database/entities/work-order";
import { NextApiRequest, NextApiResponse } from "next";


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as IGetAllWorkOrdersForUserProps;
    const workOrderEntity = new WorkOrderEntity();
    const { email, userType, orgId } = body;
    console.log(body);
    const workOrders = await workOrderEntity.getAllForUser({ email, userType, orgId });
    const sorted = workOrders?.sort((a: IWorkOrder, b: IWorkOrder) => {
      //@ts-ignore
      return new Date(b.created) - new Date(a.created);
    });

    return res.status(200).json({ response: JSON.stringify(sorted) });;

  } catch (error) {
    console.log({ error });
  }
}