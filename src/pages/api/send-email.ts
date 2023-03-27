import { SendEmailApiRequest } from "@/types";
import sendgrid from "@sendgrid/mail";

import { NextApiRequest, NextApiResponse } from "next";

type Data = {
  response: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as SendEmailApiRequest;
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error("missing SENDGRID_API_KEY env variable.");
    }
    sendgrid.setApiKey(apiKey);

    body.messages.pop();

    const t = await sendgrid.send({
      to: body.email, // The Property Manager
      cc: "mitchposk+01@gmail.com", // The Tenant
      from: "dylan@pillarhq.co", // The Email from the company
      subject: `Work Order Request for ${body.address}`, // work order for address on MM-DD-YYYY
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
          <table>
            <tr>
              <td>Address</td>
              <td>${body.address}</td>
            </tr>
            <tr>
              <td>Issue</td>
              <td>${body.issueCategory}</td>
            </tr>
            <tr>
              <td>Issue Sub-Category</td>
              <td>${body.issueSubCategory}</td>
            </tr>
            <tr>
              <td>Issue Location</td>
              <td>${body.issueLocation}</td>
            </tr>
            <tr>
              <td>Permission To Enter</td>
              <td>${body.permissionToEnter}</td>
            </tr>
          </table>
          <h2 style="font-size: 20px;">Chat History:</p>
          <div style="font-size: 14px;">
            ${body.messages?.map(m => `<p style="font-weight: normal;"><span style="font-weight: bold;" >${m.role}: </span>${m.content}</p>`).join(" ")}
          </div>
          <br/>
          <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
            Regards,<br> Pillar Team
          </p>
        </div>
      </body>
      </html>`
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ response: error.message });
  }

  return res.status(200).json({ response: "Successfully sent email" });
}
