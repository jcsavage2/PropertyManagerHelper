import { WorkOrderEntity } from '@/database/entities/work-order';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { GetSchema } from '@/types/customschemas';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse } from './_utils';
import { GetBody } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: GetBody = GetSchema.parse(req.body);
    const { pk, sk } = body;

    const workOrderEntity = new WorkOrderEntity();
    const workOrder = await workOrderEntity.get({ pk, sk });

    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify(workOrder) });
  } catch (error: any) {
    console.error(error);
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
