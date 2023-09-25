import { Data } from '@/database';
import { EventEntity } from '@/database/entities/event';
import { PropertyAddress, WorkOrderEntity } from '@/database/entities/work-order';
import { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { PTE_Type, StatusType } from '@/types';
import { deconstructKey } from '@/utils';
import twilio from "twilio";
import { UserEntity } from '@/database/entities/user';

export type AssignTechnicianBody = {
  organization: string;
  ksuID: string; //need to pass ksuID from original WO record
  technicianEmail: string;
  technicianName: string;
  workOrderId: string;
  address: PropertyAddress;
  status: StatusType;
  issueDescription: string;
  permissionToEnter: PTE_Type;
  pmEmail: string;
  pmName: string;
  tenantEmail: string;
  tenantName: string;
  oldAssignedTo: Set<string>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  if (!session) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as AssignTechnicianBody;
    const { ksuID, workOrderId, pmEmail, technicianEmail, technicianName, address, status, issueDescription, permissionToEnter, organization, pmName, tenantName, tenantEmail, oldAssignedTo } = body;
    if (!workOrderId || !pmEmail || !technicianEmail || !technicianName || !organization || !ksuID || !pmName || !tenantEmail || !tenantName || !oldAssignedTo) {
      throw new Error('Invalid params to assign technician');
    }

    const eventEntity = new EventEntity();
    const workOrderEntity = new WorkOrderEntity();
    const userEntity = new UserEntity();

    const assignedTechnician = await workOrderEntity.assignTechnician({
      organization,
      ksuID,
      workOrderId: deconstructKey(workOrderId),
      address,
      technicianEmail,
      technicianName,
      status,
      issueDescription,
      permissionToEnter,
      pmEmail,
      pmName,
      tenantEmail,
      tenantName,
      oldAssignedTo
    });

    await eventEntity.create({
      workOrderId: deconstructKey(workOrderId),
      madeByEmail: pmEmail,
      madeByName: pmName,
      message: `Assigned ${technicianName} to the work order`,
    });

    /** SEND THE EMAIL TO THE TECHNICIAN */
    const apiKey = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('missing SENDGRID_API_KEY env variable.');
    }
    sendgrid.setApiKey(apiKey);

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
          throw new Error('missing SMS env variable(s).');
        }

        const twilioClient = twilio(smsApiKey, smsAuthToken);
        twilioClient.messages.create({
          to: technicianUser.phone,
          from: "+18449092150",
          body: `You've been assigned a work order in Pillar. View the work order at ${workOrderLink} `
        });
      } catch (err) {
        console.log({ err });
      }
    }

    await sendgrid.send({
      to: technicianEmail,
      from: "pillar@pillarhq.co",
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
          <h1>You've Been Assigned To A Work Order by ${pmName}</h1>
          <a href="${workOrderLink}">View Work Order in PILLAR</a>
          <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
            Regards,<br> Pillar Team
          </p>
        </div>
      </body>
      </html>`,
    });

    return res.status(200).json({ response: JSON.stringify(assignedTechnician) });
  } catch (error) {
    console.error(error);
  }
}

// As a technician I would want to see: street address, unit, city, state, zip, status, issueDescription. Upon clicking a work Order I could see comments etc...
