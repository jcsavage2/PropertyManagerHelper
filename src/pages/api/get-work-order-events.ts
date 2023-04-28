import { Data } from "@/database";
import { EventEntity } from "@/database/entities/event";
import { deconstructKey } from "@/utils";
import { NextApiRequest, NextApiResponse } from "next";


export type GetWorkOrderEvents = {
  workOrderId: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as GetWorkOrderEvents;
    const { workOrderId } = body;
    if (!workOrderId) {
      return res.status(400).json({ response: "Missing workOrderId" });
    }
    const eventEntity = new EventEntity();
    const events = await eventEntity.getEvents({ woId: deconstructKey(workOrderId) });
    
    return res.status(200).json({ response: JSON.stringify(events) });
  } catch (error) {
    console.error(error);
  }
}