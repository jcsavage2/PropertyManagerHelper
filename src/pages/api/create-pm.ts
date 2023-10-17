import { Data } from '@/database';
import { ICreatePMUser, IUser, UserEntity } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import sendgrid from '@sendgrid/mail';
import { userRoles } from '@/database/entities/user';
import { INVITE_STATUS } from '@/constants';

export type CreatePMBody = {
  pmName: string;
  isAdmin: boolean;
  pmEmail: string;
  organization: string;
  organizationName: string;
};

/**
 *
 * @returns `ContextUser` object.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const session = await getServerSession(req, res, options);
  // @ts-ignore
  const sessionUser: IUser = session?.user;

  //User must be an admin pm to create a pm
  if (!session || !sessionUser?.roles?.includes(userRoles.PROPERTY_MANAGER) || !sessionUser?.isAdmin) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as ICreatePMUser;
    const { organization, organizationName, userEmail, userName, isAdmin } = body;
    const userEntity = new UserEntity();

    //If pm created pm row exists, don't overwrite row
    const existingPM = await userEntity.get({ email: userEmail });
    if (existingPM && existingPM.status !== INVITE_STATUS.CREATED) {
      return res.status(403).json({ response: "User Already Exists" });
    }

    const newPM = await userEntity.createPropertyManager({ organization, organizationName, userEmail, userName, isAdmin });

    const apiKey = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('missing SENDGRID_API_KEY env variable.');
    }
    sendgrid.setApiKey(apiKey);

    const authLink = `https://pillarhq.co/?authredirect=true`;
    await sendgrid.send({
      to: userEmail,
      from: "pillar@pillarhq.co",
      subject: `Create Your Account With Pillar Work Order Management`,
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
      </html>`,
    });

    return res.status(200).json({ response: JSON.stringify(newPM) });
  } catch (error) {
    console.log({ error });
  }
}
