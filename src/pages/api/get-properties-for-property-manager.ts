import { Data } from "@/database";
import { PropertyEntity } from "@/database/entities/property";
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
    const propertyEntity = new PropertyEntity();
    const properties = await propertyEntity.getAllForPropertyManager({
      propertyManagerEmail: body.propertyManagerEmail.toLowerCase()
    });
    return properties;

  } catch (error) {

  }
}