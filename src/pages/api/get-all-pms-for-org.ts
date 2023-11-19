import { UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { GetPM } from '@/types';
import { GetPMSchema } from '@/types/customschemas';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse } from './_utils';
import * as Sentry from '@sentry/nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: GetPM = GetPMSchema.parse(req.body);
    const { organization, startKey } = body;

    const userEntity = new UserEntity();
    const response = await userEntity.getAllPMsForOrg({ organization, startKey });

    return res
      .status(API_STATUS.SUCCESS)
      .json({ response: JSON.stringify({ pms: response.pms, startKey: response.startKey }) });
  } catch (error: any) {
    console.log({ error });
    Sentry.captureException(error);
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
