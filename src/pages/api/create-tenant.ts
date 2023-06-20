import { Data } from "@/database";
import { PropertyEntity } from "@/database/entities/property";
import { TenantEntity } from "@/database/entities/tenant";
import { NextApiRequest, NextApiResponse } from "next";
import sendgrid from "@sendgrid/mail";



export type CreateTenantBody = {
  tenantEmail: string;
  tenantName: string;
  pmEmail: string;
  organization: string;
  address: string;
  unit?: string;
  state: string;
  city: string;
  country: string;
  postalCode: string;
};

/**
 * 
 * @returns `ContextUser` object.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const body = req.body as CreateTenantBody;
    const {
      organization,
      pmEmail,
      tenantEmail,
      tenantName,
      address,
      country,
      city,
      state,
      postalCode,
      unit
    } = body;

    const tenantEntity = new TenantEntity();
    const propertyEntity = new PropertyEntity();


    // CreateTenant 
    const newTenant = await tenantEntity.create({ tenantEmail, tenantName, pmEmail, address, country, city, state, postalCode, unit });
    // Create Companion Row
    await tenantEntity.createTenantCompanionRow({ pmEmail, tenantEmail });

    // Create Property
    await propertyEntity.create(
      {
        tenantEmail,
        propertyManagerEmail: pmEmail,
        address,
        country,
        city,
        state,
        postalCode,
        unit,
      });

    /** SEND THE EMAIL TO THE USER */
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error("missing SENDGRID_API_KEY env variable.");
    }
    sendgrid.setApiKey(apiKey);

    const authLink = `https://pillarhq.co/?authredirect=true`;
    await sendgrid.send({
      to: tenantEmail, // The Property Manager
      from: "dylan@pillarhq.co", // The Email from the company
      subject: `Create Your Account With Pillar Work Order Management`, // work order for address on MM-DD-YYYY
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
          <h1>You've Been Invited To Create an Account With Pillar</h1>
          <a href="${authLink}">Login to Pillar</a>
          <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
            Regards,<br> Pillar Team
          </p>
        </div>
      </body>
      </html>`
    });



    //@ts-ignore
    return res.status(200).json({ response: JSON.stringify(newTenant.Attributes) });


  } catch (error) {
    console.log({ error });
  }
}