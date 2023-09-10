import type { NextApiRequest, NextApiResponse } from 'next';
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { BucketClient } from '@/database';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const keys = req.body.keys as string[];  // expect keys to be an array of strings
  try {
    if (!keys?.length) {
      res.status(200);
    }
    const images = await Promise.all(
      keys.map(async (key) => {
        const response = await BucketClient.send(
          new GetObjectCommand({
            Bucket: "pillar-file-storage",
            Key: `work-order-images/3058d0c3-25b2-4fef-97e6-68225db6893f-1694358697643-IMG_1858.jpg`,
          })
        );
        console.log({ response });

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