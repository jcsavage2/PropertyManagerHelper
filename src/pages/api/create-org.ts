import { OrganizationEntity } from '@/database/entities/organization';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { uuid as uuidv4 } from 'uuidv4';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { ApiError, ApiResponse } from './_types';
import { CreateOrgSchema } from '@/types/customschemas';
import { errorToResponse } from './_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const { orgName } = CreateOrgSchema.parse(req.body);

    const organizationEntity = new OrganizationEntity();

    const uuid = uuidv4();
    const newOrg = await organizationEntity.create({ name: orgName, uuid });
    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify(newOrg) });
  } catch (error: any) {
    console.log({ error });
    return res.status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
