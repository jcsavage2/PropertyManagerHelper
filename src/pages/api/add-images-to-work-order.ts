import { WorkOrderEntity } from '@/database/entities/work-order';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse } from './_utils';
import { UpdateImagesSchema } from '@/types/customschemas';
import { UpdateImages } from '@/types';
import * as Sentry from '@sentry/nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: UpdateImages = UpdateImagesSchema.parse(req.body);
    const workOrderEntity = new WorkOrderEntity();

    const { images, pk, sk, addNew } = body;

    /** Add the images to THE WORK ORDER */
    const workOrder = await workOrderEntity.updateImages({
      pk,
      sk,
      images,
      addNew,
    });

    return res.status(API_STATUS.SUCCESS).json({ response: 'Successfully added images' });
  } catch (error: any) {
    console.log({ error });
    Sentry.captureException(error);
    return res.status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
