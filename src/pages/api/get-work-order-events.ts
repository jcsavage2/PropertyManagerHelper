import { EventEntity } from '@/database/entities/event';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { GetWorkOrderEventsSchema } from '@/types/customschemas';
import { GetWorkOrderEvents } from '@/types';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse } from './_utils';
import * as Sentry from '@sentry/nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: GetWorkOrderEvents = GetWorkOrderEventsSchema.parse(req.body);
    const { workOrderId } = body;

    const eventEntity = new EventEntity();
    const { events, startKey } = await eventEntity.getWOEvents({
      workOrderId,
      startKey: body.startKey,
    });

    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify({ events, startKey }) });
  } catch (error: any) {
    console.error(error);
    Sentry.captureException(error);
    return res.status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
