import { EventEntity } from '@/database/entities/event';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { GetPropertyEventsSchema, GetWorkOrderEventsSchema } from '@/types/customschemas';
import { GetPropertyEvents, GetWorkOrderEvents } from '@/types';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse } from './_utils';
import * as Sentry from '@sentry/nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: GetPropertyEvents = GetPropertyEventsSchema.parse(req.body);
    const { propertyId, startKey } = body;

    const eventEntity = new EventEntity();
    const { events, startKey: _startKey } = await eventEntity.getPropertyEvents({
      propertyId,
      startKey,
    });

    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify({ events, startKey: _startKey }) });
  } catch (error: any) {
    console.error(error);
    Sentry.captureException(error);
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
