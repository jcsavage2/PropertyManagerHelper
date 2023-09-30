import { Data } from '@/database';
import { UpdateImagesProps, WorkOrderEntity } from '@/database/entities/work-order';
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

  } catch (error: any) {
    console.log({ error });
    return res.status(error.statusCode || 500).json({ response: error.message });
  }

  return res.status(200).json({ response: 'Successfully sent email' });
}
