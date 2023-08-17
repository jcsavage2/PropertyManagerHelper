import { Events } from "@/constants";
import { Data } from "@/database";
import { EventEntity } from "@/database/entities/event";
import { IWorkOrder, PropertyAddress, WorkOrderEntity } from "@/database/entities/work-order";
import { deconstructKey } from "@/utils";
import { NextApiRequest, NextApiResponse } from "next";
import sendgrid from "@sendgrid/mail";


export type AssignTechnicianBody = {
  technicianEmail: string,
  technicianName: string,
  workOrderId: string,
  address: PropertyAddress,
  status: IWorkOrder["status"],
  issueDescription: string,
  permissionToEnter: "yes" | "no",
  pmEmail: string,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as AssignTechnicianBody;
    const { workOrderId, pmEmail, technicianEmail, technicianName, address, status, issueDescription, permissionToEnter } = body;
    if (!workOrderId || !pmEmail || !technicianEmail || !technicianName) {
      return res.status(400).json({ response: "Missing one parameter of: workOrderId, pmEmail, technicianEmail, technicianName" });
    }
    const eventEntity = new EventEntity();
    const workOrderEntity = new WorkOrderEntity();

    const assignedTechnician = await workOrderEntity.assignTechnician({
      workOrderId: deconstructKey(workOrderId),
      address,
      technicianEmail,
      status,
      issueDescription,
      permissionToEnter,
      pmEmail
    });

    await eventEntity.create({
      workOrderId: deconstructKey(workOrderId),
      updateType: Events.ASSIGNED_TO_UPDATE,
      updateDescription: `Assigned ${technicianName}(${technicianEmail}) to the work order`,
      updateMadeBy: pmEmail,
    });

    /** SEND THE EMAIL TO THE USER */
    const apiKey = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error("missing SENDGRID_API_KEY env variable.");
    }
    sendgrid.setApiKey(apiKey);

    const workOrderLink = `https://pillarhq.co/work-orders?workOrderId=${encodeURIComponent(workOrderId)}`;
    await sendgrid.send({
      to: technicianEmail, // The Property Manager
      from: "dylan@pillarhq.co", // The Email from the company
      subject: `Work Order Assigned To You`, // work order for address on MM-DD-YYYY
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
          <h1>You've Been Assigned To A Work Order</h1>
          <a href="${workOrderLink}">View Work Order in PILLAR</a>
          <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
            Regards,<br> Pillar Team
          </p>
        </div>
      </body>
      </html>`
    });

    return res.status(200).json({ response: JSON.stringify(assignedTechnician) });
  } catch (error) {
    console.error(error);
  }
}

// As a technician I would want to see: street address, unit, city, state, zip, status, issueDescription. Upon clicking a work Order I could see comments etc...