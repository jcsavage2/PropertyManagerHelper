import multer from 'multer';
import { Upload } from '@aws-sdk/lib-storage';
import { S3 } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { ApiError } from './_types';

const s3 = new S3({
  region: process.env.NEXT_PUBLIC_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY ?? '',
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // limit to 10MB
  },
});

export default async function handler(req: any, res: any) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    let woId = '';
    const files: any[] = await new Promise((resolve, reject) => {
      upload.array('image')(req, res, (error) => {
        if (error) {
          return reject(error);
        }

        woId = req.body.uuid;
        return resolve(req.files);
      });
    });

    const uploadPromises: Array<Promise<any>> = files.map((file) => {
      return new Upload({
        client: s3,

        params: {
          Bucket: 'pillar-file-storage',
          Key: `work-order-images/${woId}-${Date.now()}-${file.originalname}`, // Ensure unique filenames
          Body: file.buffer,
        },
      }).done();
    });

    const uploadResults = await Promise.all(uploadPromises);

    return res.status(API_STATUS.SUCCESS).json({
      success: true,
      files: uploadResults.map((result) => result.Location),
    });
  } catch (error) {
    console.error(error);
    //@ts-ignore
    return res
      .status(API_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
