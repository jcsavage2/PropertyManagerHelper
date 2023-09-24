import { Data } from '@/database';
import { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';
import { IUser, userRoles } from '@/database/entities/user';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { getInviteTenantSendgridEmailBody } from '@/utils';

export type ReinviteTenantBody = {
  tenantEmail: string;
  tenantName: string;
  pmName: string;
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

  //User must be a pm to reinvite tenants
  if (!session || !sessionUser?.roles?.includes(userRoles.PROPERTY_MANAGER)) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as ReinviteTenantBody;
    const {
      pmName,
      tenantEmail,
      tenantName,
      organizationName,
    } = body;

    if (
      !pmName ||
      !tenantEmail ||
      !tenantName ||
      !organizationName
    ) {
      throw new Error('reinvite-tenant Error: Missing required fields.');
    }

    /** SEND THE EMAIL TO THE USER */
    const apiKey = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('missing SENDGRID_API_KEY env variable.');
    }
    sendgrid.setApiKey(apiKey);

    const authLink = `https://pillarhq.co/?authredirect=true`;
    const emailBody = getInviteTenantSendgridEmailBody(tenantName, authLink, pmName)
    await sendgrid.send({
      to: tenantEmail,
      from: 'pillar@pillarhq.co',
      subject: `${pmName} @ ${organizationName} re-invited you to join Pillar`,
      html: emailBody,
    });

    return res.status(200).json({ response: 'true' });
  } catch (error: any) {
    console.log({ error });
    return res.status(error.statusCode || 500).json({response: error});
  }
}
