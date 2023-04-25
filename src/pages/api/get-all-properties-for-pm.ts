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
    const body = req.body as GetPropertiesForPropertyManagerApiRequest;
    const propertyEntity = new PropertyEntity();
    const propertyManagerEmail = body.propertyManagerEmail;
    const properties = await propertyEntity.getAllForPropertyManager({ propertyManagerEmail });
    return res.status(200).json({ response: JSON.stringify(properties) });;

  } catch (error) {
    console.log({ error });
  }
}