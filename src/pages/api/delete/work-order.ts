import { EventEntity } from '@/database/entities/event';
import { IUser, USER_TYPE } from '@/database/entities/user';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { deconstructKey } from '@/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { API_STATUS, USER_PERMISSION_ERROR, WO_STATUS } from '@/constants';
import { DeleteWorkOrderSchema } from '@/types/customschemas';
import * as Sentry from '@sentry/nextjs';
import { ApiError, ApiResponse } from '../_types';
import { errorToResponse } from '../_utils';
import { options } from '../auth/[...nextauth]';
import { DeleteWorkOrder } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    //@ts-ignore
    const sessionUser: IUser = session?.user;

    if (!session || !sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: DeleteWorkOrder = DeleteWorkOrderSchema.parse(req.body);
    const { pk, sk, madeByEmail, madeByName } = body;

    const eventEntity = new EventEntity();
    const woEntity = new WorkOrderEntity();

    //Cannot delete work orders that are already deleted
    const workOrder = await woEntity.get({ pk, sk });
    if (workOrder && workOrder.status === WO_STATUS.DELETED) {
      throw new ApiError(API_STATUS.BAD_REQUEST, 'Work order has already been deleted', true);
    }

    await woEntity.delete({ pk, sk });

    await eventEntity.createWOEvent({
      workOrderId: deconstructKey(pk),
      message: `Work Order Deleted`,
      madeByEmail,
      madeByName,
    });

    return res.status(API_STATUS.SUCCESS).json({ response: 'Successfully deleted entity' });
  } catch (error: any) {
    console.log({ error });
    Sentry.captureException(error);
    return res.status(error?.status || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
