import { Events } from "@/constants";
import { Data } from "@/database";
import { ENTITY_KEY } from "@/database/entities";
import { EventEntity } from "@/database/entities/event";
import { WorkOrderEntity } from "@/database/entities/work-order";
import { SendEmailApiRequest } from "@/types";
import { deconstructKey, generateKey } from "@/utils";
import sendgrid from "@sendgrid/mail";
import { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuid } from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const body = req.body as SendEmailApiRequest;
    const workOrderEntity = new WorkOrderEntity();
    const eventEntity = new EventEntity();

    const { address,
      city,
      permissionToEnter,
      country,
      postalCode,
      state,
      creatorEmail,
      creatorName,
      unit,
      createdByType,
      tenantEmail,
      organization,
      tenantName,
    } = body;

    const woId = uuid();

    /** CREATE THE WORK ORDER */
    const workOrder = await workOrderEntity.create({
      uuid: woId,
      address,
      city,
      permissionToEnter,
      country: country ?? "US",
      issue: body.issueDescription || "No Issue Description",
      location: body.issueLocation || "No Issue Location",
      additionalDetails: body.additionalDetails || "No Additional Details",
      postalCode,
      propertyManagerEmail: body.pmEmail,
      state,
      ...(organization && { organization: deconstructKey(organization) }),
      status: "TO_DO",
      createdBy: creatorEmail,
      createdByType,
      // If the tenantEmail/tenantName is not provided, then the WO was created by a tenant and we can use creatorEmail and creatorName
      tenantEmail: tenantEmail ?? creatorEmail,
      tenantName: tenantName ?? creatorName,
      unit,
    });



    const workOrderLink = `https://pillarhq.co/work-orders?workOrderId=${encodeURIComponent(generateKey(ENTITY_KEY.WORK_ORDER, woId))}`;

    /** SEND THE EMAIL TO THE USER */
    const apiKey = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error("missing SENDGRID_API_KEY env variable.");
    }
    sendgrid.setApiKey(apiKey);

    body.messages.pop();

    /** CREATE THE FIRST EVENT FOR THE WO */
    await eventEntity.create({
      workOrderId: woId,
      updateType: Events.STATUS_UPDATE,
      updateDescription: "Work Order Created",
      updateMadeBy: creatorEmail,
    });


    for (const message of body.messages) {
      // Create a comment for each existing comment so the Work Order has context.
      await eventEntity.create({
        workOrderId: deconstructKey(workOrder?.pk),
        updateType: Events.COMMENT_UPDATE,
        updateDescription: message.content ?? "",
        updateMadeBy: message.role === "user" ? body.tenantEmail ?? "" : message.role
      });
    }

    await sendgrid.send({
      to: body.pmEmail, // The Property Manager
      cc: creatorEmail === body.pmEmail ? "mitchposk+emailMatch@gmail.com" : creatorEmail.toLowerCase(), // The Tenant
      from: "dylan@pillarhq.co", // The Email from the company
      subject: `Work Order Request for ${body.address + (body.unit ? " " + body.unit : "")}`,
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
              <td>${body.issueLocation ?? "None provided"}</td>
            </tr>
            <tr>
              <td>Additional Details</td>
              <td>${body.additionalDetails ?? "None provided"}</td>
            </tr>
            <tr>
              <td>Permission To Enter</td>
              <td>${body.permissionToEnter}</td>
            </tr>
            <tr>
              <td>Address</td>
              <td>${body.address}</td>
            </tr>
            <tr>
              <td>Unit</td>
              <td>${body.unit ?? "No Unit"}</td>
            </tr>
            <tr>
              <td>City</td>
              <td>${body.city}</td>
            </tr>
            <tr>
              <td>State</td>
              <td>${body.state}</td>
            </tr>
            <tr>
              <td>Postal Code</td>
              <td>${body.postalCode}</td>
            </tr>
          </table>
          <h2 style="font-size: 20px;">Chat History:</p>
          <div style="font-size: 14px;">
            ${body.messages?.map((m) => `<p style="font-weight: normal;"><span style="font-weight: bold;" >${m.role}: </span>${m.content}</p>`).join(" ")}
          </div>
          <br/>
          <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
            Regards,<br> Pillar Team
          </p>
        </div>
      </body>
      </html>`,
    });
  } catch (error: any) {
    console.log({ error });
    return res.status(error.statusCode || 500).json({ response: error.message });
  }

  return res.status(200).json({ response: "Successfully sent email" });
}
