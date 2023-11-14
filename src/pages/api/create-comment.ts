import { EventEntity } from '@/database/entities/event';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { IUser, USER_TYPE } from '@/database/entities/user';
import { deconstructKey } from '@/utils';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse } from './_utils';
import { CreateCommentSchema } from '@/types/customschemas';
import { CreateComment } from '@/types';
import * as Sentry from '@sentry/nextjs';

/**
 *
 * @returns newly created comment or error message on failure.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    //@ts-ignore
    const sessionUser: IUser = session?.user;

    //User must be a pm or technician to create a comment
    if (
      !session ||
      (!sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER) &&
        !sessionUser?.roles?.includes(USER_TYPE.TECHNICIAN))
    ) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: CreateComment = CreateCommentSchema.parse(req.body);
    const { comment, email, name } = body;

    const eventEntity = new EventEntity();
    const newComment = await eventEntity.create({
      workOrderId: deconstructKey(body.workOrderId),
      madeByEmail: email,
      madeByName: name,
      message: comment,
    });

    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify(newComment) });
  } catch (error: any) {
    console.log({ error });
    Sentry.captureException(error);
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
