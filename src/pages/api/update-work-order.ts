import { Events, PTE_Type, STATUS, Status } from '@/constants';
import { Data } from '@/database';
import { EventEntity } from '@/database/entities/event';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { deconstructKey } from '@/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';

type UpdateWorkOrderApiRequest = {
  pk: string;
  sk: string;
  email: string; //email of the current user who made the update
  status: Status;
  permissionToEnter?: PTE_Type;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(401);
    return;
  }
  try {
    const apiKey = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error("missing SENDGRID_API_KEY env variable.");
    }
    sendgrid.setApiKey(apiKey);

    const body = req.body as UpdateWorkOrderApiRequest;
    const workOrderEntity = new WorkOrderEntity();
    const eventEntity = new EventEntity();
    const { pk, sk, status, email, permissionToEnter } = body;



    const updatedWorkOrder = await workOrderEntity.update({
      pk,
      sk,
      status,
      ...(permissionToEnter && { permissionToEnter }),
    });

    //Spawn new event on status change
    await eventEntity.create({
      workOrderId: deconstructKey(pk),
      updateType: Events.STATUS_UPDATE,
      updateDescription: `Changed work order status to: ${status}`,
      updateMadeBy: email,
    });

    const subject = `Work Order Status Update${updatedWorkOrder?.address?.unit ? ` for unit ${updatedWorkOrder?.address.unit}` : ""}`;

    // If work order was created by a tenant
    if (updatedWorkOrder?.tenantEmail && updatedWorkOrder?.pk && updatedWorkOrder.status === STATUS.COMPLETE) {
      const workOrderLink = `https://pillarhq.co/work-orders?workOrderId=${encodeURIComponent(updatedWorkOrder.pk)}`;
      await sendgrid.send({
        to: updatedWorkOrder.tenantEmail,
        from: "pillar@pillarhq.co",
        subject,
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
            <h1>Work Order Status Complete ${updatedWorkOrder?.address?.unit ? `for unit ${updatedWorkOrder?.address.unit}` : ""}</h1>
            <a href="${workOrderLink}">View Work Order in PILLAR</a>
            <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
              Regards,<br> Pillar Team
            </p>
          </div>
        </body>
        </html>`
      });
    }

    return res.status(200).json({ response: JSON.stringify(updatedWorkOrder) });;

  } catch (error) {
    console.log({ error });
  }
}
