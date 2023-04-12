import { Data } from "@/database";
import { TenantEntity } from "@/database/entities/tenant";
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
    // TBU
    const body = req.body as GetPropertiesForPropertyManagerApiRequest;
    const tenantEntity = new TenantEntity();
    const propertyManagerEmail = body.propertyManagerEmail;
    const workOrders = await tenantEntity.getAllForPropertyManager({ propertyManagerEmail });
    return res.status(200).json({ response: JSON.stringify(workOrders) });;

  } catch (error) {
    console.log({ error });
  }
}