import { Data } from '@/database';
import { PropertyEntity } from '@/database/entities/property';
import { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';
import { IUser, UserEntity, userRoles } from '@/database/entities/user';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';

export type CreateTenantBody = {
  tenantEmail: string;
  tenantName: string;
  pmEmail: string;
  pmName: string;
  address: string;
  unit?: string;
  state: string;
  city: string;
  country: 'US' | 'CA';
  postalCode: string;
  numBeds: number;
  numBaths: number;
  createNewProperty: boolean;
  organization: string;
  organizationName: string;
  propertyUUId: string;
};

/**
 *
 * @returns `ContextUser` object.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  // @ts-ignore
  const sessionUser: IUser = session?.user;

  //User must be a pm to create tenants
  if (!session || !sessionUser?.roles?.includes(userRoles.PROPERTY_MANAGER)) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as CreateTenantBody;
    const {
      pmEmail,
      pmName,
      tenantEmail,
      tenantName,
      organization,
      organizationName,
      address,
      country = 'US',
      city,
      state,
      postalCode,
      unit,
      numBeds,
      numBaths,
      propertyUUId,
      createNewProperty,
    } = body;

    if (
      !pmName ||
      !pmEmail ||
      !tenantEmail ||
      !tenantName ||
      !address ||
      !city ||
      !state ||
      !postalCode ||
      !numBeds ||
      !numBaths ||
      !propertyUUId ||
      !organization ||
      !organizationName
    ) {
      throw new Error('create-tenant Error: Missing required fields.');
    }

    const userEntity = new UserEntity();
    const propertyEntity = new PropertyEntity();

    // Create Tenant
    const newTenant = await userEntity.createTenant({
      tenantEmail,
      tenantName,
      pmEmail,
      pmName,
      propertyUUId,
      address,
      country,
      city,
      state,
      postalCode,
      unit,
      organization,
      organizationName,
      numBeds,
      numBaths,
    });

    // Create Property if necessary
    if (createNewProperty) {
      await propertyEntity.create({
        tenantEmail,
        propertyManagerEmail: pmEmail,
        organization,
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

    /** SEND THE EMAIL TO THE USER */
    const apiKey = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('missing SENDGRID_API_KEY env variable.');
    }
    sendgrid.setApiKey(apiKey);

    const authLink = `https://pillarhq.co/?authredirect=true`;
    await sendgrid.send({
      to: tenantEmail,
      from: "pillar@pillarhq.co",
      subject: `${pmName} @ ${organizationName} is requesting you to join Pillar`,
      html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>The HTML5 Herald</title>
        <style>
          html {
            font-family: arial, sans-serif;
          }

          body, p, h1, h2, h3, li, ol {
            color: black;
          }

          a {
            display: inline-block;
            font-size: 14px;
          }

          p, li {
            font-size: 14px;
          }
        </style>
        <meta name="description" content="The HTML5 Herald">
        <meta name="author" content="SitePoint">
        <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
        <link rel="stylesheet" href="css/styles.css?v=1.0">
      </head>
      
      <body>
        <div class="container" style="margin-left: 20px;margin-right: 20px;">
          <h2>${pmName} invited you To manage your work orders in Pillar</h2>
          <p>Dear ${tenantName},</p>
          <p>We are launching a new Program called Pillar that let's you convieniently submit your maintenance requests online at any time!</p>
          <p>Here is how to use it:</p>
          <h3>Instructions</h3>
          <ol>
            <li>
              <a href="${authLink}">Click this Link to Pillar</a> and enter your current email address to join.
            </li>
            <li>
              Receive a login link via email and click it to start submitting Work Orders!
            </li>
          </ol>
          
          <p>As always, feel free to call or email me with any questions!</p>
          <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
            Regards,<br> ${pmName}
          </p>
        </div>
      </body>
      </html>`,
    });

    return res.status(200).json({ response: JSON.stringify(newTenant) });
  } catch (error: any) {
    console.log({ error });
    return res.status(error.statusCode || 500).json(error);
  }
}
