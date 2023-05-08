import { Events } from "@/constants";
import { Data } from "@/database";
import { EventEntity } from "@/database/entities/event";
import { WorkOrderEntity } from "@/database/entities/work-order";
import { deconstructKey } from "@/utils";
import { NextApiRequest, NextApiResponse } from "next";


export type RemoveTechnicianBody = {
  workOrderId: string;
  pmEmail: string;
  technicianEmail: string;
  technicianName: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as RemoveTechnicianBody;
    const { workOrderId, pmEmail, technicianEmail, technicianName } = body;
    if (!workOrderId || !pmEmail || !technicianEmail || !technicianName) {
      return res.status(400).json({ response: "Missing one parameter of: workOrderId, pmEmail, technicianEmail, technicianName" });
    }
    const eventEntity = new EventEntity();
    const workOrderEntity = new WorkOrderEntity();
    await eventEntity.create({
      workOrderId: deconstructKey(workOrderId),
      updateType: Events.ASSIGNED_TO_UPDATE,
      updateDescription: `Removed ${technicianName}(${technicianEmail}) from the work order`,
      updateMadeBy: pmEmail,
    });
    const response = await workOrderEntity.removeTechnician({ woId: deconstructKey(workOrderId), technicianEmail });

    return res.status(200).json({ response: JSON.stringify(response) });
  } catch (error) {
    console.error(error);
  }
}