import type { NextApiRequest, NextApiResponse } from 'next';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { BucketClient } from '@/database';
import { getServerSession } from 'next-auth/next';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { ApiError } from './_types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const keys = req.body.keys as string[]; // expect keys to be an array of strings
    if (!keys?.length) {
      res.status(API_STATUS.SUCCESS);
    }

    const images = await Promise.all(
      keys.map(async (key) => {
        const newKey = key.replace('https://pillar-file-storage.s3.us-east-1.amazonaws.com/', '');
        const decoded = decodeURIComponent(newKey);
        const response = await BucketClient.send(
          new GetObjectCommand({
            Bucket: 'pillar-file-storage',
            Key: decoded,
          })
        );

        if (response.Body) {
          const body = await new Promise<Buffer>((resolve, reject) => {
            const chunks: any[] = [];
            //@ts-ignore
            response.Body?.on('data', (chunk) => chunks.push(chunk));
            //@ts-ignore
            response.Body?.on('end', () => resolve(Buffer.concat(chunks)));
          });

          // Convert each image buffer to a data URI
          return `data:image/jpeg;base64,${body.toString('base64')}`;
        }
      })
    );
    res.status(API_STATUS.SUCCESS).json({ images });
  } catch (error) {
    // @ts-ignore
    res.status(API_STATUS.INTERNAL_SERVER_ERROR).send('Failed to Upload Image');
  }
}
export const config = {
  api: {
    responseLimit: '10mb',
  },
};
