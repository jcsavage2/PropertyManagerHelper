import { EVENTS, UPDATE_TYPE } from '@/constants';
import { Data } from '@/database';
import { EventEntity } from '@/database/entities/event';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { PTE_Type, StatusType } from '@/types';
import { deconstructKey } from '@/utils';
import { NextApiRequest, NextApiResponse } from 'next';

type UpdateWorkOrderApiRequest = {
  pk: string;
  sk: string;
  email: string; //email of the current user who made the update
  name: string; //name of the current user who made the update
  status: StatusType;
  permissionToEnter?: PTE_Type;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const body = req.body as UpdateWorkOrderApiRequest;
    const workOrderEntity = new WorkOrderEntity();
    const eventEntity = new EventEntity();
    const { pk, sk, status, email, permissionToEnter, name } = body;
    const newWorkOrder = await workOrderEntity.update({
      pk,
      sk,
      status,
      ...(permissionToEnter && { permissionToEnter }),
    });

    //Spawn new event on status change
    await eventEntity.create({
      workOrderId: deconstructKey(pk),
      type: EVENTS.UPDATE,
      updateType: UPDATE_TYPE.STATUS,
      message: `Updated work order status: ${status}`,
      madeByEmail: email,
      madeByName: name,
    });
    

    return res.status(200).json({ response: JSON.stringify(newWorkOrder?.Attributes) });
  } catch (error) {
    console.log({ error });
  }
}
