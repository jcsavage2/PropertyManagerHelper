import type { NextApiRequest, NextApiResponse } from 'next';
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { BucketClient } from '@/database';
import { getServerSession } from "next-auth/next";
import { options } from "./auth/[...nextauth]";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(401);
    return;
  }

  const keys = req.body.keys as string[];  // expect keys to be an array of strings
  try {
    if (!keys?.length) {
      res.status(200);
    }

    const images = await Promise.all(
      keys.map(async (key) => {
        const newKey = key.replace("https://pillar-file-storage.s3.us-east-1.amazonaws.com/", "");
        const decoded = decodeURI(newKey);
        const response = await BucketClient.send(
          new GetObjectCommand({
            Bucket: "pillar-file-storage",
            Key: decoded,
          })
        );

        if (response.Body) {
          const body = await new Promise<Buffer>((resolve, reject) => {
            const chunks: any[] = [];
            //@ts-ignore
            response.Body?.on("data", (chunk) => chunks.push(chunk));
            //@ts-ignore
            response.Body?.on("end", () => resolve(Buffer.concat(chunks)));
          });

          // Convert each image buffer to a data URI
          return `data:image/jpeg;base64,${body.toString('base64')}`;
        }
      })
    );
    res.status(200).json({ images });
  } catch (error) {
    console.log({ error });
    res.status(500).send("Internal Server Error");
  }
}
export const config = {
  api: {
    responseLimit: '10mb',
  },
};