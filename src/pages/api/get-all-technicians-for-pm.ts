import { Data } from "@/database";
import { TechnicianEntity } from "@/database/entities/technician";
import { NextApiRequest, NextApiResponse } from "next";

type GetTechniciansForPropertyManagerApiRequest = {
  propertyManagerEmail: "string";
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try { 
    const body = req.body as GetTechniciansForPropertyManagerApiRequest;
    const techEntity = new TechnicianEntity();
    const propertyManagerEmail = body.propertyManagerEmail;
    const techs = await techEntity.getAllForPropertyManager({ propertyManagerEmail });
    return res.status(200).json({ response: JSON.stringify(techs) });;

  } catch (error) {
    console.log({ error });
  }
}