import { EVENTS } from "@/constants";
import { Data } from "@/database";
import { EventEntity } from "@/database/entities/event";
import { NextApiRequest, NextApiResponse } from "next";

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
      type: EVENTS.COMMENT,
      madeByEmail: email,
      madeByName: name,
      message: comment,
    });

    return res.status(200).json({ response: JSON.stringify(newComment) });
  } catch (error) {
    console.log({ error });
  }
}