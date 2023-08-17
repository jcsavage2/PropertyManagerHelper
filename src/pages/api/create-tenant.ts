import { Data } from "@/database";
import { PropertyEntity } from "@/database/entities/property";
import { TenantEntity } from "@/database/entities/tenant";
import { NextApiRequest, NextApiResponse } from "next";
import sendgrid from "@sendgrid/mail";
import { UserEntity } from "@/database/entities/user";

export type CreateTenantBody = {
  tenantEmail: string;
  tenantName: string;
  pmEmail: string;
  address: string;
  unit?: string;
  state: string;
  city: string;
  country: "US" | "CA";
  postalCode: string;
  numBeds: number;
  numBaths: number;
  createNewProperty: boolean;
  propertyUUId: string;
};

function sleep(milliseconds: any) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

/**
 *
 * @returns `ContextUser` object.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const body = req.body as CreateTenantBody;
    const { pmEmail, tenantEmail, tenantName, address, country = "US", city, state, postalCode, unit, numBeds, numBaths, propertyUUId, createNewProperty } = body;

    if(!pmEmail || !tenantEmail || !tenantName || !address || !city || !state || !postalCode || !numBeds || !numBaths || !propertyUUId) {
      throw new Error("create-tenant Error: Missing required fields.");
    }

    const userEntity = new UserEntity();
    const propertyEntity = new PropertyEntity();

    // Create Tenant
    const newTenant = await userEntity.createTenant({
      tenantEmail,
      tenantName,
      pmEmail,
      propertyUUId,
      address,
      country,
      city,
      state,
      postalCode,
      unit,
      numBeds,
      numBaths,
    });

    // Create Property if necessary
    if(createNewProperty) {
      await propertyEntity.create({
        tenantEmail,
        propertyManagerEmail: pmEmail,
        address,
        city,
        country,
        postalCode,
        state,
        unit,
        uuid: propertyUUId,
        numBeds,
        numBaths,
      });
    }

    // /** SEND THE EMAIL TO THE USER */
    const apiKey = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;
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

    return res.status(200).json({ response: JSON.stringify(newTenant) });


  } catch (error: any) {
    console.log({ error });
    return res.status(error.statusCode || 500).json(error);
  }
}
