import { UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { ApiError, ApiResponse } from './_types';
import { GetTenantsForOrgSchema } from '@/types/customschemas';
import { errorToResponse } from './_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const { organization, startKey, tenantSearchString, statusFilter, fetchAllTenants } =
      GetTenantsForOrgSchema.parse(req.body);

    const userEntity = new UserEntity();
    const response = await userEntity.getAllTenantsForOrg({
      organization,
      startKey,
      statusFilter,
      tenantSearchString,
      fetchAllTenants,
    });

    return res
      .status(API_STATUS.SUCCESS)
      .json({
        response: JSON.stringify({ tenants: response.tenants, startKey: response.startKey }),
      });
  } catch (error: any) {
    console.log({ error });
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
