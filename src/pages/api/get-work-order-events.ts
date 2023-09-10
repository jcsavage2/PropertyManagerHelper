import { Data } from "@/database";
import { StartKey } from "@/database/entities";
import { EventEntity } from "@/database/entities/event";
import { EventType } from "@/types";
import { NextApiRequest, NextApiResponse } from "next";


export type GetWorkOrderEvents = {
  workOrderId: string;
  type: EventType;
  startKey?: StartKey;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetWorkOrderEvents;
    const { workOrderId, type } = body;
    if (!workOrderId || !type) {
      return res.status(400).json({ response: "Missing workOrderId or type" });
    }
    const eventEntity = new EventEntity();
    const { events, startKey } = await eventEntity.getEvents({ workOrderId, type, startKey: body.startKey });
    return res.status(200).json({ response: JSON.stringify({ events, startKey }) });
  } catch (error) {
    console.error(error);
  }
}