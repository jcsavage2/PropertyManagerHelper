import { Events } from "@/constants";
import { Data } from "@/database";
import { EventEntity } from "@/database/entities/event";
import { NextApiRequest, NextApiResponse } from "next";

export type CreateCommentBody = {
  comment: string;
  email: string;
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
      workOrderId
    } = body;

    const eventEntity = new EventEntity();
    const newComment = await eventEntity.create({ workOrderId, updateType: Events.COMMENT_UPDATE, updateDescription: comment, updateMadeBy: email });

    return res.status(200).json({ response: JSON.stringify(newComment) });
  } catch (error) {
    console.log({ error });
  }
}