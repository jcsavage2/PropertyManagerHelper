import { BucketClient, Data } from '@/database';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextApiRequest, NextApiResponse } from 'next';

export type GetS3BucketRequest = {
  bucket: string;
  key: string;
};

/*
 * Retrieves the value for the given key from the given s3 bucket.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const { bucket, key } = req.body as GetS3BucketRequest;

    const url = await getSignedUrl(
      BucketClient,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      { expiresIn: 3600 }
    );

    return res.status(200).json({ response: url });
  } catch (error: any) {
    console.log({ error });
    return res.status(500).json({ response: JSON.stringify(error) });
  }
}
