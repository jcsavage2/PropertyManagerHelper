import { PropertyEntity } from '@/database/entities/property';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { GetProperties } from '@/types';
import { ApiError, ApiResponse } from './_types';
import { GetPropertiesSchema } from '@/types/customschemas';
import { errorToResponse } from './_utils';
import * as Sentry from '@sentry/nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: GetProperties = GetPropertiesSchema.parse(req.body);

    const propertyEntity = new PropertyEntity();
    const response = await propertyEntity.getByOrganization({
      organization: body.organization,
      startKey: body.startKey,
      searchString: body.propertySearchString,
    });

    return res.status(API_STATUS.SUCCESS).json({
      response: JSON.stringify({ properties: response.properties, startKey: response.startKey }),
    });
  } catch (error: any) {
    console.log({ error });
    Sentry.captureException(error);
    return res.status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
