import { EventEntity } from '@/database/entities/event';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]';
import { IUser, USER_TYPE } from '@/database/entities/user';
import { ApiError, ApiResponse } from '../../_types';
import { API_STATUS, USER_PERMISSION_ERROR, WORK_ORDER_TYPE } from '@/constants';
import { errorToResponse } from '../../_utils';
import { deconstructKey, toTitleCase } from '@/utils';
import * as Sentry from '@sentry/nextjs';
import { AssignRemoveTechnicianSchema } from '@/types/customschemas';
import { AssignRemoveTechnician } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    //@ts-ignore
    const sessionUser: IUser = session?.user;

    //User must be a pm to unassign a technician from a WO
    if (!session || (!sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER) && !sessionUser?.roles?.includes(USER_TYPE.TECHNICIAN))) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: AssignRemoveTechnician = AssignRemoveTechnicianSchema.parse(req.body);
    const { pk, assignerEmail, technicianEmail, technicianName, assignerName } = body;

    const eventEntity = new EventEntity();
    const workOrderEntity = new WorkOrderEntity();

    const response = await workOrderEntity.removeTechnician({
      pk,
      technicianEmail,
      technicianName,
    });

    const workOrderType = response && response.workType ? response.workType : WORK_ORDER_TYPE.MAINTENANCE_REQUEST;

    await eventEntity.createWOEvent({
      workOrderId: deconstructKey(pk),
      madeByEmail: assignerEmail,
      madeByName: assignerName,
      message: `Removed ${toTitleCase(technicianName)} from the ${workOrderType}`,
    });

    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify(response) });
  } catch (error: any) {
    console.error(error);
    Sentry.captureException(error);
    return res.status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
