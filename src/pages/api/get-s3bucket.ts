import { BucketClient } from '@/database';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { GetS3BucketSchema } from '@/types/customschemas';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse } from './_utils';
import * as Sentry from '@sentry/nextjs';

/*
 * Retrieves the value for the given key from the given s3 bucket.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const { bucket, key } = GetS3BucketSchema.parse(req.body);

    const url = await getSignedUrl(
      BucketClient,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      { expiresIn: 3600 }
    );

    return res.status(API_STATUS.SUCCESS).json({ response: url });
  } catch (error: any) {
    console.error(error);
    Sentry.captureException(error);
    return res.status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
