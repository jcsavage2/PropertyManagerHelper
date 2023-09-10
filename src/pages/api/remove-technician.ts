import { EVENTS, UPDATE_TYPE } from "@/constants";
import { Data } from "@/database";
import { EventEntity } from "@/database/entities/event";
import { WorkOrderEntity } from "@/database/entities/work-order";
import { deconstructKey } from "@/utils";
import { NextApiRequest, NextApiResponse } from "next";


export type RemoveTechnicianBody = {
  workOrderId: string;
  pmEmail: string;
  pmName: string
  technicianEmail: string;
  technicianName: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as RemoveTechnicianBody;
    const { workOrderId, pmEmail, technicianEmail, technicianName, pmName } = body;
    if (!workOrderId || !pmEmail || !technicianEmail || !technicianName || !pmName) {
      return res.status(400).json({ response: "Missing one parameter of: workOrderId, pmEmail, technicianEmail, technicianName" });
    }
    console.log("Removing technician: ", workOrderId)
    const eventEntity = new EventEntity();
    const workOrderEntity = new WorkOrderEntity();
    await eventEntity.create({
      workOrderId,
      type: EVENTS.UPDATE,
      updateType: UPDATE_TYPE.UNASSIGNED,
      madeByEmail: pmEmail,
      madeByName: pmName,
      message: `Removed ${technicianName} (${technicianEmail}) from the work order`,
    });
    
    const response = await workOrderEntity.removeTechnician({ workOrderId: workOrderId, technicianEmail });

    return res.status(200).json({ response: JSON.stringify(response) });
  } catch (error) {
    console.error(error);
  }
}