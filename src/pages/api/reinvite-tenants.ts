import { Data } from '@/database';
import { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';
import { IUser, userRoles } from '@/database/entities/user';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { getInviteTenantSendgridEmailBody } from '@/utils';

export type ReinviteTenantsBody = {
  tenants: { name: string; email: string }[];
  pmName: string;
  organizationName: string;
};

/**
 *
 * @returns true if successful, error on failure
 * @description Re-invites a list of tenants to join Pillar
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
    const body = req.body as ReinviteTenantsBody;
    const { pmName, tenants, organizationName } = body;

    if (!pmName || !tenants || !organizationName) {
      throw new Error('reinvite-tenant Error: Missing required fields.');
    }

    /** SEND THE EMAIL TO THE USER */
    const apiKey = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('missing SENDGRID_API_KEY env variable.');
    }
    sendgrid.setApiKey(apiKey);

    const authLink = `https://pillarhq.co/?authredirect=true`;
    for (const tenant of tenants) {
      const { name: tenantName, email: tenantEmail } = tenant;
      const emailBody = getInviteTenantSendgridEmailBody(tenantName, authLink, pmName);
      await sendgrid.send({
        to: tenantEmail,
        from: 'pillar@pillarhq.co',
        subject: `${pmName} @ ${organizationName} re-invited you to join Pillar`,
        html: emailBody,
      });
    }

    return res.status(200).json({ response: 'true' });
  } catch (error: any) {
    console.log({ error });
    return res.status(error.statusCode || 500).json({ response: error });
  }
}
