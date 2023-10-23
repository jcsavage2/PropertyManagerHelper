import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { UserEntity } from '@/database/entities/user';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { errorToResponse } from './_utils';
import { UpdateUserSchema } from '@/types/customschemas';
import { UpdateUser } from '@/types';
import { ApiError, ApiResponse } from './_types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR)
    }

    const body: UpdateUser = UpdateUserSchema.parse(req.body);
    const { pk, sk, hasSeenDownloadPrompt } = body;

    const userEntity = new UserEntity();
    const updatedUser = await userEntity.updateUser({ pk, sk, hasSeenDownloadPrompt });

    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify(updatedUser) });
  } catch (error: any) {
    console.error(error);
    return res.status(error.status || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
