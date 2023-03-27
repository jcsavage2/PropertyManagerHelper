import { PropertyEntity } from "@/database/entities/property";
import { NextApiRequest, NextApiResponse } from "next";

type Data = {
  response: string;
};

type GetPropertiesForPropertyManagerApiRequest = {
  propertyManagerEmail: "string";
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    console.log("here...");
    const body = req.body as GetPropertiesForPropertyManagerApiRequest;
    const propertyEntity = new PropertyEntity();
    const properties = await propertyEntity.getAllForPropertyManager({
      propertyManagerEmail: body.propertyManagerEmail.toLowerCase()
    });
    console.log({ properties });

  } catch (error) {

  }
}