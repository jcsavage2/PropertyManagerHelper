import { Data } from "@/database";
import { IWorkOrder, WorkOrderEntity } from "@/database/entities/work-order";
import { NextApiRequest, NextApiResponse } from "next";

type GetWorkOrdersForTenantApiRequest = {
  tenantEmail: "string";
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetWorkOrdersForTenantApiRequest;
    const workOrderEntity = new WorkOrderEntity();
    const tenantEmail = body.tenantEmail;
    const workOrders = await workOrderEntity.getAllForTenant({ tenantEmail });
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