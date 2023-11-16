import { API_STATUS, USER_PERMISSION_ERROR, WO_STATUS } from '@/constants';
import { ENTITY_KEY } from '@/database/entities';
import { EventEntity } from '@/database/entities/event';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { generateKey, toTitleCase } from '@/utils';
import sendgrid from '@sendgrid/mail';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { USER_TYPE } from '@/database/entities/user';
import { ChatCompletionRequestMessage } from 'openai';
import { CreateWorkOrderSchema } from '@/types/customschemas';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse, initializeSendgrid } from './_utils';
import { CreateWorkOrder } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    if (!session) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: CreateWorkOrder = CreateWorkOrderSchema.parse(req.body);
    const workOrderEntity = new WorkOrderEntity();
    const eventEntity = new EventEntity();

    const {
      property,
      permissionToEnter,
      creatorEmail,
      creatorName,
      images,
      createdByType,
      tenantEmail,
      organization,
      tenantName,
      pmEmail,
      pmName,
      woId,
    } = body;

    if (createdByType !== USER_TYPE.TENANT && (!tenantEmail || !tenantName || !pmName)) {
      throw new ApiError(
        API_STATUS.BAD_REQUEST,
        "Missing tenant email, name, or pmName when creating a WO on a tenant's behalf."
      );
    }

    const derivedTenantEmail = createdByType === USER_TYPE.TENANT ? creatorEmail : tenantEmail!;
    const derivedTenantName = createdByType === USER_TYPE.TENANT ? creatorName : tenantName!;

    const workOrderId = generateKey(ENTITY_KEY.WORK_ORDER, woId);

    //Don't overwrite existing work orders
    const existingWorkOrder = await workOrderEntity.get({ pk: workOrderId, sk: workOrderId });
    if (existingWorkOrder) {
      throw new ApiError(API_STATUS.FORBIDDEN, 'Work Order with that ID Already Exists');
    }

    /** CREATE THE WORK ORDER */
    const workOrder = await workOrderEntity.create({
      uuid: woId,
      address: property.address,
      city: property.city,
      permissionToEnter,
      country: property.country,
      issue: body.issueDescription || 'No Issue Description',
      location: body.issueLocation || 'No Issue Location',
      additionalDetails: body.additionalDetails || '',
      postalCode: property.postalCode,
      pmEmail,
      state: property.state,
      images: images ?? [],
      organization,
      status: WO_STATUS.TO_DO,
      createdBy: creatorEmail,
      createdByType,
      tenantEmail: derivedTenantEmail,
      tenantName: derivedTenantName,
      unit: property.unit,
    });

    const workOrderLink = `https://pillarhq.co/work-orders?workOrderId=${encodeURIComponent(
      generateKey(ENTITY_KEY.WORK_ORDER, woId)
    )}`;

    /** SEND THE EMAIL TO THE USER */
    initializeSendgrid(sendgrid, process.env.NEXT_PUBLIC_SENDGRID_API_KEY);

    if (body.messages) {
      body.messages.pop();
      for (const message of body.messages) {
        // Create a comment for each existing message so the Work Order has context.
        await eventEntity.create({
          workOrderId: woId,
          message: message.content ?? '',
          ksuId: message.ksuId,
          madeByEmail: message.role === 'user' ? derivedTenantEmail : 'pillar assistant',
          madeByName: message.role === 'user' ? derivedTenantName : 'pillar assistant',
        });
      }
    }

    //CC the tenant if they created the work order, if a pm created the work order then a different email is sent to the tenant
    const ccString = body.createdByType === USER_TYPE.TENANT ? creatorEmail : '';

    const shortenedWorkOrderIdString = woId.substring(woId.length - 4);

    await sendgrid.send({
      to: body.pmEmail, // The Property Manager
      ...(!!ccString && { cc: ccString }),
      from: 'pillar@pillarhq.co',
      subject: `Work Order ${shortenedWorkOrderIdString} Requested for ${
        toTitleCase(body.property.address) ?? ''
      } ${toTitleCase(body.property.unit) ?? ''}`,
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
          <h1>New Work Order Request</h1>
          <a href="${workOrderLink}">View Work Order in PILLAR</a>
          <table>
            <tr>
              <td>Issue</td>
              <td>${body.issueDescription}</td>
            </tr>
            <tr>
              <td>Issue Location</td>
              <td>${body.issueLocation ?? 'None provided'}</td>
            </tr>
            <tr>
              <td>Additional Details</td>
              <td>${body.additionalDetails ?? 'None provided'}</td>
            </tr>
            <tr>
              <td>Permission To Enter</td>
              <td>${body.permissionToEnter}</td>
            </tr>
            <tr>
              <td>Address</td>
              <td>${toTitleCase(body.property.address)}</td>
            </tr>
            <tr>
              <td>Unit</td>
              <td>${toTitleCase(body.property.unit ?? 'No Unit')}</td>
            </tr>
            <tr>
              <td>City</td>
              <td>${toTitleCase(body.property.city)}</td>
            </tr>
            <tr>
              <td>State</td>
              <td>${toTitleCase(body.property.state)}</td>
            </tr>
            <tr>
              <td>Postal Code</td>
              <td>${body.property.postalCode}</td>
            </tr>
          </table>
          <h2 style="font-size: 20px;">Chat History:</p>
          <div style="font-size: 14px;">
            ${
              body.messages
                ?.map(
                  (m: ChatCompletionRequestMessage) =>
                    `<p style="font-weight: normal;"><span style="font-weight: bold;" >${toTitleCase(
                      m.role
                    )}: </span>${m.content}</p>`
                )
                .join(' ') ?? 'No user chat history'
            }
          </div>
          <br/>
          <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
            Regards,<br> Pillar Team
          </p>
        </div>
      </body>
      </html>`,
    });

    //If the tenant didn't create the work order, make sure they are notified
    if (body.createdByType !== USER_TYPE.TENANT) {
      await sendgrid.send({
        to: derivedTenantEmail,
        from: 'pillar@pillarhq.co',
        subject: `${toTitleCase(pmName)} created a Work Order for you! "${body.issueDescription}"`,
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

            p {
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
            <h2>New Work Order Request</h2>
            <p>${toTitleCase(pmName)} created a Work Order for you! "${body.issueDescription}"</p>
            <p>You can view your work order <a href="${workOrderLink}">here</a></p>
            
            <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
              Regards,<br> Pillar Team
            </p>
            <p style="font-style: italic; font-size: 14px">If this work order was created incorrectly, please contact your property manager for assistance</p>
          </div>
        </body>
        </html>`,
      });
    }

    //Work order created event
    await eventEntity.create({
      workOrderId: woId,
      madeByEmail: creatorEmail, //If the user is a pm then they created it, otherwise this is a system message
      madeByName: creatorName,
      message: `Work Order Created!`,
    });

    return res.status(API_STATUS.SUCCESS).json({ response: 'Successfully sent email' });
  } catch (error: any) {
    console.log({ error });
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
