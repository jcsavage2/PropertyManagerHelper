import { Data } from "@/database";
import { WorkOrderEntity } from "@/database/entities/work-order";
import { NextApiRequest, NextApiResponse } from "next";

type GetPropertiesForPropertyManagerApiRequest = {
  propertyManagerEmail: "string";
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetPropertiesForPropertyManagerApiRequest;
    const workOrderEntity = new WorkOrderEntity();
    const propertyManagerEmail = body.propertyManagerEmail;
    const workOrders = await workOrderEntity.getAllForPropertyManager({ propertyManagerEmail });

    return res.status(200).json({ response: JSON.stringify(workOrders) });;

  } catch (error) {
    console.log({ error });
  }
}