import { Data } from '@/database';
import { UpdateImagesProps, WorkOrderEntity } from '@/database/entities/work-order';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      return res.status(401).json({ response: 'Unauthorized Request' });
    }
    const body = req.body as UpdateImagesProps;
    const workOrderEntity = new WorkOrderEntity();

    const {
      images,
      pk,
      sk,
      addNew
    } = body as UpdateImagesProps;

    /** Add the images to THE WORK ORDER */
    const workOrder = await workOrderEntity.updateImages({
      pk,
      sk,
      images,
      addNew
    });

    return res.status(200).json({ response: JSON.stringify(workOrder) });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ response: 'Error adding images to work order' });
  }

}
