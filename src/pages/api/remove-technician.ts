import { EventEntity } from '@/database/entities/event';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { IUser, USER_TYPE } from '@/database/entities/user';
import { ApiError, ApiResponse } from './_types';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { RemoveTechnicianSchema } from '@/types/customschemas';
import { RemoveTechnicianBody } from '@/types';
import { errorToResponse } from './_utils';
import { toTitleCase } from '@/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    //@ts-ignore
    const sessionUser: IUser = session?.user;

    //User must be a pm to unassign a technician from a WO
    if (!session || !sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: RemoveTechnicianBody = RemoveTechnicianSchema.parse(req.body);
    const {
      workOrderId,
      pmEmail,
      technicianEmail,
      technicianName,
      pmName,
      oldAssignedTo,
      oldViewedWO,
    } = body;

    const eventEntity = new EventEntity();
    const workOrderEntity = new WorkOrderEntity();
    await eventEntity.create({
      workOrderId,
      madeByEmail: pmEmail,
      madeByName: pmName,
      message: `Removed ${toTitleCase(technicianName)} from the work order`,
    });

    const response = await workOrderEntity.removeTechnician({
      workOrderId: workOrderId,
      technicianEmail,
      technicianName,
      assignedTo: oldAssignedTo,
      viewedWO: oldViewedWO,
    });

    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify(response) });
  } catch (error: any) {
    console.error(error);
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
