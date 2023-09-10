import { Events, PTE_Type, Status } from '@/constants';
import { Data } from '@/database';
import { EventEntity } from '@/database/entities/event';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { deconstructKey } from '@/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';

type UpdateWorkOrderApiRequest = {
  pk: string;
  sk: string;
  email: string; //email of the current user who made the update
  status: Status;
  permissionToEnter?: PTE_Type;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as UpdateWorkOrderApiRequest;
    const workOrderEntity = new WorkOrderEntity();
    const eventEntity = new EventEntity();
    const { pk, sk, status, email, permissionToEnter } = body;
    const newWorkOrder = await workOrderEntity.update({
      pk,
      sk,
      status,
      ...(permissionToEnter && { permissionToEnter }),
    });

    //Spawn new event on status change
    await eventEntity.create({
      workOrderId: deconstructKey(pk),
      updateType: Events.STATUS_UPDATE,
      updateDescription: `Changed work order status to: ${status}`,
      updateMadeBy: email,
    });

    return res.status(200).json({ response: JSON.stringify(newWorkOrder?.Attributes) });
  } catch (error) {
    console.log({ error });
  }
}
