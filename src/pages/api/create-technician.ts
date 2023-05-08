import { Data } from "@/database";
import { TechnicianEntity } from "@/database/entities/technician";
import { NextApiRequest, NextApiResponse } from "next";

export type CreateTechnicianBody = {
  technicianEmail: string;
  technicianName: string;
  pmEmail: string;
  organization: string;
};

/**
 * 
 * @returns `ContextUser` object.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as CreateTechnicianBody;
    const {
      technicianEmail,
      technicianName,
      organization,
      pmEmail,
    } = body;

    const technicianEntity = new TechnicianEntity();

    const newTechnician = await technicianEntity.create({ name: technicianName, email: technicianEmail, organization, pmEmail });
    console.log({ newTechnician });

    //@ts-ignore
    return res.status(200).json({ response: JSON.stringify(newTechnician.Attributes) });


  } catch (error) {
    console.log({ error });
  }
}