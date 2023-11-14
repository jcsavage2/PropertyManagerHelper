import { IWorkOrder, WorkOrderEntity } from '@/database/entities/work-order';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { GetAllWorkOrdersForUserSchema } from '@/types/customschemas';
import { GetAllWorkOrdersForUser } from '@/types';
import { errorToResponse } from './_utils';
import { ApiError, ApiResponse } from './_types';
import * as Sentry from '@sentry/nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: GetAllWorkOrdersForUser = GetAllWorkOrdersForUserSchema.parse(req.body);
    const { email, userType, orgId, startKey, statusFilter, reverse } = body;

    const workOrderEntity = new WorkOrderEntity();
    const response = await workOrderEntity.getAllForUser({
      email,
      userType,
      orgId,
      startKey,
      statusFilter,
      reverse,
    });
    const workOrders = response.workOrders
      ? response.workOrders.sort((a: IWorkOrder, b: IWorkOrder) => {
        //@ts-ignore
        return new Date(b.created) - new Date(a.created);
      })
      : [];

    return res
      .status(API_STATUS.SUCCESS)
      .json({ response: JSON.stringify({ workOrders, startKey: response.startKey }) });
  } catch (error: any) {
    console.log({ error });
    Sentry.captureException(error);
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
