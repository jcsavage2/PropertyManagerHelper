import { Data } from "@/database";
import { PropertyEntity } from "@/database/entities/property";
import { NextApiRequest, NextApiResponse } from "next";

export type GetPropertiesForPropertyManagerApiRequest = {
  pmEmail: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetPropertiesForPropertyManagerApiRequest;
    const propertyEntity = new PropertyEntity();
    const properties = await propertyEntity.getAllForPropertyManager({ pmEmail: body.pmEmail });
    return res.status(200).json({ response: JSON.stringify(properties) });;

  } catch (error) {
    console.log({ error });
    return res.status(500).json({ response: JSON.stringify({ error }) });
  }
}