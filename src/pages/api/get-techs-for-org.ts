import { UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { GetTechsForOrgSchema } from '@/types/customschemas';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse } from './_utils';
import { GetTechsForOrg } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const { organization, startKey, techSearchString }: GetTechsForOrg = GetTechsForOrgSchema.parse(
      req.body,
    );

    const userEntity = new UserEntity();
    const response = await userEntity.getAllTechniciansForOrg({
      organization,
      startKey,
      techSearchString,
    });

    return res
      .status(API_STATUS.SUCCESS)
      .json({ response: JSON.stringify({ techs: response.techs, startKey: response.startKey }) });
  } catch (error: any) {
    console.log({ error });
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
