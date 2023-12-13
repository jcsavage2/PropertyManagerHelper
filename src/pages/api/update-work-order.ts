import { API_STATUS, USER_PERMISSION_ERROR, WO_STATUS } from '@/constants';
import { EventEntity } from '@/database/entities/event';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { UpdateWorkOrder } from '@/types';
import { deconstructKey, toTitleCase } from '@/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { USER_TYPE } from '@/database/entities/user';
import { errorToResponse, initializeSendgrid } from './_utils';
import { ApiError, ApiResponse } from './_types';
import { UpdateWorkOrderSchema } from '@/types/customschemas';
import * as Sentry from '@sentry/nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    // @ts-ignore
    const sessionUser: IUser = session?.user;

    const body: UpdateWorkOrder = UpdateWorkOrderSchema.parse(req.body);
    const { pk, sk, status, email, permissionToEnter, name } = body;

    //User must be a pm or technician to update a work order's status
    //User must be a tenant or pm to update a work order's permission to enter
    if (
      !session ||
      (status &&
        !sessionUser?.roles?.includes(USER_TYPE.TECHNICIAN) &&
        !sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) ||
      (permissionToEnter &&
        !sessionUser?.roles?.includes(USER_TYPE.TENANT) &&
        !sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER))
    ) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const workOrderEntity = new WorkOrderEntity();
    const eventEntity = new EventEntity();
    const updatedWorkOrder = await workOrderEntity.update({
      pk,
      status,
      ...(permissionToEnter && { permissionToEnter }),
    });

    //Spawn new event on status/PTE change
    await eventEntity.createWOEvent({
      workOrderId: deconstructKey(pk),
      message: status
        ? `Updated work order status: ${status}`
        : `Updated permission to enter to "${permissionToEnter}"`,
      madeByEmail: email,
      madeByName: name,
    });

    initializeSendgrid(sendgrid, process.env.NEXT_PUBLIC_SENDGRID_API_KEY);

    // If work order was created by a tenant
    if (
      updatedWorkOrder?.tenantEmail &&
      updatedWorkOrder?.pk &&
      updatedWorkOrder.status === WO_STATUS.COMPLETE &&
      !permissionToEnter
    ) {
      const subject = `Work Order Update for ${
        toTitleCase(updatedWorkOrder?.address?.address) ?? ''
      } ${
        updatedWorkOrder?.address?.unit ? ` ${toTitleCase(updatedWorkOrder?.address.unit)}` : ''
      }`;
      const workOrderLink = `https://pillarhq.co/work-orders?workOrderId=${encodeURIComponent(
        updatedWorkOrder.pk
      )}`;
      await sendgrid.send({
        to: updatedWorkOrder.tenantEmail,
        cc:
          updatedWorkOrder.pmEmail !== updatedWorkOrder.tenantEmail ? updatedWorkOrder.pmEmail : '',
        from: 'pillar@pillarhq.co',
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
            <h1>Work Order Status Complete ${
              updatedWorkOrder?.address?.unit
                ? `for unit ${toTitleCase(updatedWorkOrder?.address.unit)}`
                : ''
            }</h1>
            <a href="${workOrderLink}">View Work Order in PILLAR</a>
            <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
              Regards,<br> Pillar Team
            </p>
          </div>
        </body>
        </html>`,
      });
    }

    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify(updatedWorkOrder) });
  } catch (error: any) {
    console.log({ error });
    Sentry.captureException(error);
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
