import { Data } from "@/database";
import { OrganizationEntity } from "@/database/entities/organization";
import { NextApiRequest, NextApiResponse } from "next";
import { uuid as uuidv4 } from "uuidv4";



export type CreateOrgBody = {
  name: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as CreateOrgBody;
    const { name } = body;

    const organizationEntity = new OrganizationEntity();
    const uuid = uuidv4();
    const newOrg = await organizationEntity.create({ name, uuid });
    return res.status(200).json({ response: JSON.stringify(newOrg) });

  } catch (error) {
    console.log({ error });
  }

}