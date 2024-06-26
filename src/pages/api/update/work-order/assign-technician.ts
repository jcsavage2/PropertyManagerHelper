import { EventEntity } from '@/database/entities/event';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]';
import { deconstructKey, toTitleCase } from '@/utils';
import twilio from 'twilio';
import { USER_TYPE, UserEntity } from '@/database/entities/user';
import { API_STATUS, USER_PERMISSION_ERROR, WORK_ORDER_TYPE } from '@/constants';
import { ApiError, ApiResponse } from '../../_types';
import { MISSING_ENV, errorToResponse, initializeSendgrid } from '../../_utils';
import { AssignRemoveTechnician } from '@/types';
import { init, track } from '@amplitude/analytics-node';
import * as Sentry from '@sentry/nextjs';
import { AssignRemoveTechnicianSchema } from '@/types/customschemas';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    //@ts-ignore
    const sessionUser: IUser = session?.user;

    if (!session || (!sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER) && !sessionUser?.roles?.includes(USER_TYPE.TECHNICIAN))) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: AssignRemoveTechnician = AssignRemoveTechnicianSchema.parse(req.body);
    const { pk, assignerEmail, technicianEmail, technicianName, assignerName } = body;

    const eventEntity = new EventEntity();
    const workOrderEntity = new WorkOrderEntity();
    const userEntity = new UserEntity();

    const updatedWO = await workOrderEntity.assignTechnician({
      pk,
      technicianEmail,
      technicianName,
    });

    if (!updatedWO) {
      throw new ApiError(API_STATUS.INTERNAL_SERVER_ERROR, 'Error assigning technician, updating work order partition failed');
    }

    const workOrderType = updatedWO.workType || WORK_ORDER_TYPE.MAINTENANCE_REQUEST;

    await eventEntity.createWOEvent({
      workOrderId: deconstructKey(pk),
      madeByEmail: assignerEmail,
      madeByName: assignerName,
      message: `Assigned ${toTitleCase(technicianName)} to the ${workOrderType}`,
    });

    initializeSendgrid(sendgrid, process.env.NEXT_PUBLIC_SENDGRID_API_KEY);

    const workOrderLink = `https://pillarhq.co/work-orders?workOrderId=${encodeURIComponent(pk)}`;

    /**
     * Send SMS message to the technician if they have a phone number.
     */
    const technicianUser = await userEntity.get({ email: technicianEmail });
    if ((!updatedWO.workType || updatedWO.workType === WORK_ORDER_TYPE.MAINTENANCE_REQUEST) && technicianUser?.phone) {
      try {
        await init('ff368b4943b9a03a49b2c3b925e62021').promise;
        track(
          'SMS Notification',
          {
            status: 'attempt',
            assignedTo: technicianEmail,
            assignedBy: assignerEmail,
          },
          { user_id: assignerEmail }
        );
        const smsApiKey = process.env.NEXT_PUBLIC_SMS_API_KEY;
        const smsAuthToken = process.env.NEXT_PUBLIC_SMS_AUTH_TOKEN;
        if (!smsApiKey || !smsAuthToken) {
          throw new ApiError(API_STATUS.INTERNAL_SERVER_ERROR, MISSING_ENV('Twilio sms'));
        }

        const twilioClient = twilio(smsApiKey, smsAuthToken);
        twilioClient.messages.create({
          to: technicianUser.phone,
          from: '+18449092150',
          body: `You've been assigned a work order in Pillar by ${toTitleCase(assignerName)}!\n\nIssue: ${updatedWO?.issue}\n\nAddress: ${toTitleCase(
            updatedWO.address?.address
          )}\n\n${!!updatedWO.address?.unit ? `${`Unit: ${toTitleCase(updatedWO.address.unit)}`}\n\n` : ``}${
            updatedWO.tenantName && `Tenant: ${toTitleCase(updatedWO.tenantName)}`
          }\n\n
          ${updatedWO.permissionToEnter && `Tenant: ${updatedWO.permissionToEnter}`}\n\n
          View the full work order at ${workOrderLink}\n\n 
          `,
        });
        track(
          'SMS Notification',
          {
            status: 'success',
            assignedTo: technicianEmail,
            assignedBy: assignerEmail,
          },
          { user_id: assignerEmail }
        );
      } catch (err) {
        track(
          'SMS Notification',
          {
            status: 'failed',
            assignedTo: technicianEmail,
            assignedBy: assignerEmail,
          },
          { user_id: assignerEmail }
        );
        console.log({ err });
      }
    }

    const shortenedWorkOrderIdString = pk.substring(pk.length - 4);
    const displayAreasForCarpeting = updatedWO.areasForCarpeting ? updatedWO.areasForCarpeting.join(', ') : 'None provided';
    const displayAreasForPadding = updatedWO.areasForPadding ? updatedWO.areasForPadding.join(', ') : 'None provided';

    /** SEND THE EMAIL TO THE TECHNICIAN */
    await sendgrid.send({
      to: technicianEmail,
      from: 'pillar@pillarhq.co',
      subject: `${workOrderType} ${shortenedWorkOrderIdString} Assigned To You`,
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
          <h1>You've Been Assigned To A ${workOrderType} by ${toTitleCase(assignerName)}</h1>
          <a href="${workOrderLink}">View ${workOrderType} in PILLAR</a>
          ${updatedWO.issue && `<p>Issue: ${toTitleCase(updatedWO.issue)}</p>`}
          <p>Address: ${toTitleCase(updatedWO.address?.address)}</p>
          ${updatedWO.address?.unit ? `<p>Unit: ${toTitleCase(updatedWO.address.unit)}</p>` : ``}
          ${updatedWO.tenantName && `<p>Tenant: ${toTitleCase(updatedWO.tenantName)}</p>`}
          ${
            workOrderType === WORK_ORDER_TYPE.PAINT_JOB || workOrderType === WORK_ORDER_TYPE.CARPET_JOB
              ? `
          <p>Apartment Size: ${updatedWO.apartmentSize ?? 'None provided'}</p>
          ${
            workOrderType === WORK_ORDER_TYPE.CARPET_JOB
              ? `
              <p>Areas for carpeting: ${displayAreasForCarpeting}</p>
              <p>Areas for padding: ${displayAreasForPadding}</p>`
              : ``
          }
        
            <p>Move In Date: ${updatedWO.moveInDate ?? 'None provided'}</p>`
              : ``
          }
          <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
            Regards,<br> Pillar Team
          </p>
        </div>
      </body>
      </html>`,
    });

    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify(updatedWO) });
  } catch (error: any) {
    console.error(error);
    Sentry.captureException(error);
    return res.status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
