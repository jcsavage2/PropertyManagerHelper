import { PropertyEntity } from '@/database/entities/property';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { GetProperties } from '@/types';
import { ApiError, ApiResponse } from './_types';
import { GetPropertiesSchema } from '@/types/customschemas';
import { errorToResponse } from './_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: GetProperties = GetPropertiesSchema.parse(req.body);
    let response;

    //Get properties by either pmEmail OR orgId, if both are present then throw error
    if (body.pmEmail && body.organization) {
      throw new ApiError(
        API_STATUS.BAD_REQUEST,
        'Attempting to get properties with org AND pm info'
      );
    }
    const propertyEntity = new PropertyEntity();

    if (body.pmEmail) {
      response = await propertyEntity.getAllForPropertyManager({
        pmEmail: body.pmEmail,
        startKey: body.startKey,
      });
    } else {
      response = await propertyEntity.getByOrganization({
        organization: body.organization!,
        startKey: body.startKey,
      });
    }

    return res.status(API_STATUS.SUCCESS).json({
      response: JSON.stringify({ properties: response.properties, startKey: response.startKey }),
    });
  } catch (error: any) {
    console.log({ error });
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
