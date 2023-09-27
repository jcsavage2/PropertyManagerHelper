import { Data } from '@/database';
import { IGetAllWorkOrdersForUserProps, IWorkOrder, WorkOrderEntity } from '@/database/entities/work-order';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as IGetAllWorkOrdersForUserProps;
    const workOrderEntity = new WorkOrderEntity();
    const { email, userType, orgId, startKey, statusFilter } = body;
    const response = await workOrderEntity.getAllForUser({ email, userType, orgId, startKey, statusFilter });
    const workOrders = response.workOrders ? response.workOrders.sort((a: IWorkOrder, b: IWorkOrder) => {
      //@ts-ignore
      return new Date(b.created) - new Date(a.created);
    }) : [];

    return res.status(200).json({ response: JSON.stringify({ workOrders, startKey: response.startKey }) });
  } catch (error) {
    return res.status(500).json({ response: '' });
  }
}
