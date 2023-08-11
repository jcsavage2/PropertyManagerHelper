import { Data } from "@/database";
import { UserEntity } from "@/database/entities/user";
import { NextApiRequest, NextApiResponse } from "next";

type GetTechniciansForPropertyManagerApiRequest = {
  pmEmail: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetTechniciansForPropertyManagerApiRequest;
    const userEntity = new UserEntity();
    const techs = await userEntity.getAllTechniciansForProperyManager({ pmEmail: body.pmEmail });
    return res.status(200).json({ response: JSON.stringify(techs) });;
  } catch (error) {
    console.log({ error });
    return res.status(200).json({ response: JSON.stringify([]) });;
  }
}