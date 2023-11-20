import { PropertyEntity } from '@/database/entities/property';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { GetPropertiesByAddress } from '@/types';
import { ApiError, ApiResponse } from './_types';
import { GetPropertiesByAddressSchema } from '@/types/customschemas';
import { errorToResponse } from './_utils';
import * as Sentry from '@sentry/nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: GetPropertiesByAddress = GetPropertiesByAddressSchema.parse(req.body);

    const propertyEntity = new PropertyEntity();
    const response = await propertyEntity.getPropertiesByAddress({
      address: {
        address: body.property.address.toUpperCase(),
        city: body.property.city.toUpperCase(),
        state: body.property.state.toUpperCase(),
        country: body.property.country,
        postalCode: body.property.postalCode.toUpperCase(),
      },
      organization: body.organization,
    });

    return res.status(API_STATUS.SUCCESS).json({
      response: JSON.stringify({ properties: response }),
    });
  } catch (error: any) {
    console.log({ error });
    Sentry.captureException(error);
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
