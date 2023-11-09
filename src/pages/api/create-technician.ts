import { UserEntity, USER_TYPE } from '@/database/entities/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import sendgrid from '@sendgrid/mail';
import { API_STATUS, INVITE_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { errorToResponse, initializeSendgrid } from './_utils';
import { ApiError, ApiResponse } from './_types';
import { CreateTechnician } from '@/types';
import { CreateTechnicianSchema } from '@/types/customschemas';
import { toTitleCase } from '@/utils';

/**
 *
 * @returns `ContextUser` object.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    // @ts-ignore
    const sessionUser: IUser = session?.user;

    //User must be a pm to create technicians
    if (!session || !sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: CreateTechnician = CreateTechnicianSchema.parse(req.body);
    const { technicianEmail, technicianName, organization, organizationName, pmEmail, pmName } =
      body;

    const userEntity = new UserEntity();

    //Don't overwrite existing technician
    const existingTechnician = await userEntity.get({ email: technicianEmail });
    if (existingTechnician && existingTechnician.status !== INVITE_STATUS.CREATED) {
      throw new ApiError(API_STATUS.FORBIDDEN, 'User already exists.', true);
    }

    const newTechnician = await userEntity.createTechnician({
      technicianName,
      technicianEmail,
      organization,
      organizationName,
      pmEmail,
      pmName,
    });

    const authLink = `https://pillarhq.co/?authredirect=true`;

    initializeSendgrid(sendgrid, process.env.NEXT_PUBLIC_SENDGRID_API_KEY);

    await sendgrid.send({
      to: technicianEmail,
      from: 'pillar@pillarhq.co',
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
          <h1>You've Been Invited To Create a Technician Account With Pillar</h1>
          <a href="${authLink}">Login to Pillar to see view work orders for ${toTitleCase(
            organizationName
          )}</a>
          <p class="footer" style="font-size: 16px;font-weight: normal;padding-bottom: 20px;border-bottom: 1px solid #D1D5DB;">
            Regards,<br> Pillar Team
          </p>
        </div>
      </body>
      </html>`,
    });

    return res.status(API_STATUS.SUCCESS).json({ response: JSON.stringify(newTechnician) });
  } catch (error: any) {
    console.log({ error });
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
