import { Events } from "@/constants";
import { Data } from "@/database";
import { EventEntity } from "@/database/entities/event";
import { WorkOrderEntity, WorkOrderStatus } from "@/database/entities/work-order";
import { deconstructKey } from "@/utils";
import { NextApiRequest, NextApiResponse } from "next";

type UpdateWorkOrderApiRequest = {
  pk: string;
  sk: string;
  status: WorkOrderStatus;
  permissionToEnter?: "yes" | "no";
  email: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as UpdateWorkOrderApiRequest;
    const workOrderEntity = new WorkOrderEntity();
    const eventEntity = new EventEntity();
    const { pk, sk, status, email, permissionToEnter } = body;
    const newWorkOrder = await workOrderEntity.update({
      pk,
      sk,
      status,
      ...(permissionToEnter && { permissionToEnter })
    });

    //Spawn new event on status change
    await eventEntity.create({
      workOrderId: deconstructKey(pk),
      updateType: Events.STATUS_UPDATE,
      updateDescription: `Changed work order status to: ${status}`,
      updateMadeBy: email,
    });

    return res.status(200).json({ response: JSON.stringify(newWorkOrder) });;

  } catch (error) {
    console.log({ error });
  }
}