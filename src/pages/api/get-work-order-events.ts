import { Data } from "@/database";
import { StartKey } from "@/database/entities";
import { EventEntity } from "@/database/entities/event";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { options } from "./auth/[...nextauth]";


export type GetWorkOrderEvents = {
  workOrderId: string;
  startKey?: StartKey;
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
    const body = req.body as GetWorkOrderEvents;
    const { workOrderId } = body;
    if (!workOrderId) {
      return res.status(400).json({ response: "Missing workOrderId" });
    }
    const eventEntity = new EventEntity();
    const { events, startKey } = await eventEntity.getEvents({ workOrderId, startKey: body.startKey });
    return res.status(200).json({ response: JSON.stringify({ events, startKey }) });
  } catch (error) {
    console.error(error);
  }
}