import { Data } from "@/database";
import { EventEntity } from "@/database/entities/event";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { options } from "./auth/[...nextauth]";
import { IUser, userRoles } from "@/database/entities/user";

export type CreateCommentBody = {
  comment: string;
  email: string;
  name: string;
  workOrderId: string;
};

/**
 * 
 * @returns newly created comment.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const session = await getServerSession(req, res, options);
  //@ts-ignore
  const sessionUser: IUser = session?.user;

  //User must be a pm or technician to create a comment
  if (!session || (!sessionUser?.roles?.includes(userRoles.PROPERTY_MANAGER) && !sessionUser?.roles?.includes(userRoles.TECHNICIAN))) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as CreateCommentBody;
    const {
      comment,
      email,
      name,
      workOrderId
    } = body;

    const eventEntity = new EventEntity();
    const newComment = await eventEntity.create({
      workOrderId,
      madeByEmail: email,
      madeByName: name,
      message: comment,
    });

    return res.status(200).json({ response: JSON.stringify(newComment) });
  } catch (error) {
    console.log({ error });
  }
}