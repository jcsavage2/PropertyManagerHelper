import { Data } from "@/database";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { options } from "./auth/[...nextauth]";
import { UserEntity } from "@/database/entities/user";


export type UpdateUser = {
  pk: string;
  sk: string;
  hasSeenDownloadPrompt?: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as UpdateUser;
    const { pk, sk, hasSeenDownloadPrompt } = body;
    if (!pk || !sk) {
      throw new Error("Missing pk or sk");
    }

    const userEntity = new UserEntity();
    const updatedUser = await userEntity.updateUser({ pk, sk, hasSeenDownloadPrompt });
    return res.status(200).json({ response: JSON.stringify(updatedUser) });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ response: error });
  }
}