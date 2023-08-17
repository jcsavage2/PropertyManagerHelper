import { Data } from "@/database";
import { UserEntity } from "@/database/entities/user";
import { NextApiRequest, NextApiResponse } from "next";

export type GetTenantsForPropertyManagerApiRequest = {
  pmEmail: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetTenantsForPropertyManagerApiRequest;
    const userEntity = new UserEntity();
    const tenants = await userEntity.getAllTenantsForProperyManager({ pmEmail: body.pmEmail });
    return res.status(200).json({ response: JSON.stringify(tenants) });

  } catch (error) {
    console.log({ error });
  }
}


