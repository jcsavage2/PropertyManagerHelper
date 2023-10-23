import { EventEntity } from '@/database/entities/event';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { deconstructKey, toTitleCase } from '@/utils';
import twilio from 'twilio';
import { UserEntity } from '@/database/entities/user';
import { API_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { ApiError, ApiResponse } from './_types';
import { AssignTechnicianSchema } from '@/types/customschemas';
import { MISSING_ENV, errorToResponse, initializeSendgrid } from './_utils';
import { AssignTechnicianBody } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: AssignTechnicianBody = AssignTechnicianSchema.parse(req.body);
    const {
      ksuID,
      workOrderId,
      pmEmail,
      technicianEmail,
      technicianName,
      property,
      status,
      issueDescription,
      permissionToEnter,
      organization,
      pmName,
      tenantName,
      tenantEmail,
      oldAssignedTo,
    } = body;

    const eventEntity = new EventEntity();
    const workOrderEntity = new WorkOrderEntity();
    const userEntity = new UserEntity();

    const assignedTechnician = await workOrderEntity.assignTechnician({
      organization,
      ksuID,
      workOrderId: deconstructKey(workOrderId),
      property,
      technicianEmail,
      technicianName,
      status,
      issueDescription,
      permissionToEnter,
      pmEmail,
      pmName,
      tenantEmail,
      tenantName,
      oldAssignedTo,
    });

    await eventEntity.create({
      workOrderId: deconstructKey(workOrderId),
      madeByEmail: pmEmail,
      madeByName: pmName,
      message: `Assigned ${toTitleCase(technicianName)} to the work order`,
    });

    initializeSendgrid(sendgrid, process.env.NEXT_PUBLIC_SENDGRID_API_KEY);

    const workOrderLink = `https://pillarhq.co/work-orders?workOrderId=${encodeURIComponent(workOrderId)}`;

    /**
     * Send SMS message to the technician if they have a phone number.
     */
    const technicianUser = await userEntity.get({ email: technicianEmail });
    if (technicianUser?.phone) {
      try {
        const smsApiKey = process.env.NEXT_PUBLIC_SMS_API_KEY;
        const smsAuthToken = process.env.NEXT_PUBLIC_SMS_AUTH_TOKEN;
        if (!smsApiKey || !smsAuthToken) {
          throw new Error(MISSING_ENV('Twilio sms'));
        }

        const twilioClient = twilio(smsApiKey, smsAuthToken);
        twilioClient.messages.create({
          to: technicianUser.phone,
          from: '+18449092150',
          body: `You've been assigned a work order in Pillar by ${toTitleCase(pmName)}!\n\nIssue: ${issueDescription}\n\nAddress: ${toTitleCase(
            property.address
          )}\n\n${!!property.unit ? `${`Unit: ${toTitleCase(property.unit)}`}\n\n` : ``}${tenantName && `Tenant: ${toTitleCase(tenantName)}`}\n\n${
            permissionToEnter && `Permission To Enter: ${permissionToEnter}\n\n`
          }View the full work order at ${workOrderLink}\n\n 
          `,
        });
      } catch (err) {
        console.log({ err });
      }
    }

    /** SEND THE EMAIL TO THE TECHNICIAN */
    await sendgrid.send({
      to: technicianEmail,
      from: 'pillar@pillarhq.co',
      subject: `Work Order ${workOrderId} Assigned To You`,
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
          <h1>You've Been Assigned To A Work Order by ${toTitleCase(pmName)}</h1>
          <a href="${workOrderLink}">View Work Order in PILLAR</a>
          <p>Issue: ${issueDescription}</p>
          <p>Address: ${toTitleCase(property.address)}</p>
          ${property.unit ? `<p>Unit: ${toTitleCase(property.unit)}</p>` : ``}
          ${tenantName && `<p>Tenant: ${toTitleCase(tenantName)}</p>`}
          <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
            Regards,<br> Pillar Team
          </p>
        </div>
      </body>
      </html>`,
    });

    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify(assignedTechnician) });
  } catch (error: any) {
    console.error(error);
    return res.status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR).json(errorToResponse(error));
  }
}
