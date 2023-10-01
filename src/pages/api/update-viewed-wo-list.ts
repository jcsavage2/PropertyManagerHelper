import { Data } from '@/database';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { deconstructKey } from '@/utils';
import sendgrid from '@sendgrid/mail';

export type UpdateViewedWORequest = {
  pk: string;
  sk: string;
  newViewedWOList: string[];
  email: string;
  pmEmail: string;
};

/*
* This function is called when a user opens a work order.
*/
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(401);
    return;
  }
  try {
    const apiKey = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('missing SENDGRID_API_KEY env variable.');
    }
    sendgrid.setApiKey(apiKey);
    const body = req.body as UpdateViewedWORequest;
    const { pk, sk, email, newViewedWOList, pmEmail } = body;
    if(!pk || !sk || !email || !newViewedWOList || !pmEmail) {
      throw new Error('Missing pk, sk, email, oldViewedWOList, or pmEmail');
    }
    const woEntity = new WorkOrderEntity();

    const workOrderLink = `https://pillarhq.co/work-orders?workOrderId=${encodeURIComponent(pk)}`;
    const wo = await woEntity.update({ pk, viewedWO: newViewedWOList });
    await sendgrid.send({
      to: pmEmail,
      from: 'pillar@pillarhq.co',
      subject: `Work Order ${deconstructKey(pk)} opened by technician ${email}`,
      html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>The HTML5 Herald</title>
        <style>
          html {
            font-family: arial, sans-serif;
          }
          table {
            font-family: arial, sans-serif;
            border-collapse: collapse;
            width: 50%;
          }

          td {
            border: 1px solid #dddddd;
            text-align: left;
            padding: 8px;
          }

          tr:nth-child(even) {
            background-color: #dddddd;
          }

          a {
            display: inline-block;
            margin-bottom: 20px;
            font-size: 20px;
          }

          @media only screen and (max-width: 600px) {
            table {
              font-family: arial, sans-serif;
              border-collapse: collapse;
              width: 100%;
            }
          }
        </style>
        <meta name="description" content="The HTML5 Herald">
        <meta name="author" content="SitePoint">
        <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
        <link rel="stylesheet" href="css/styles.css?v=1.0">
      </head>
      
      <body>
        <div class="container" style="margin-left: 20px;margin-right: 20px;">
          <h1>Work Order ${deconstructKey(pk)} opened by technician ${email}</h1>
          <a href="${workOrderLink}">View Work Order in PILLAR</a>
          <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
            Regards,<br> Pillar Team
          </p>
        </div>
      </body>
      </html>`,
    });
    return res.status(200).json({ response: JSON.stringify(wo) });
  } catch (error) { }
}