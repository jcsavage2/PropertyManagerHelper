import { NextApiRequest, NextApiResponse } from 'next';
import sendgrid from '@sendgrid/mail';
import { IUser, UserEntity, USER_TYPE } from '@/database/entities/user';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';
import { generateKey, getInviteTenantSendgridEmailBody, toTitleCase } from '@/utils';
import { ENTITIES, ENTITY_KEY } from '@/database/entities';
import { API_STATUS, INVITE_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { ApiError, ApiResponse } from './_types';
import { errorToResponse, initializeSendgrid } from './_utils';
import { ReinviteTenantsSchema } from '@/types/customschemas';
import { ReinviteTenantsBody } from '@/types';

/**
 *
 * @returns true if successful, error on failure
 * @description Re-invites a list of tenants to join Pillar
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const session = await getServerSession(req, res, options);
    // @ts-ignore
    const sessionUser: IUser = session?.user;

    //User must be a pm to reinvite tenants
    if (!session || !sessionUser?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
      throw new ApiError(API_STATUS.UNAUTHORIZED, USER_PERMISSION_ERROR);
    }

    const body: ReinviteTenantsBody = ReinviteTenantsSchema.parse(req.body);
    const { pmName, tenants, organizationName } = body;

    /** SEND THE EMAIL TO THE USER */
    initializeSendgrid(sendgrid, process.env.NEXT_PUBLIC_SENDGRID_API_KEY);

    const userEntity = new UserEntity();

    const authLink = `https://pillarhq.co/?authredirect=true`;
    for (const tenant of tenants) {
      const { name: tenantName, email: tenantEmail } = tenant;
      const emailBody = getInviteTenantSendgridEmailBody(tenantName, authLink, pmName);
      await sendgrid.send({
        to: tenantEmail,
        from: 'pillar@pillarhq.co',
        subject: `${toTitleCase(pmName)} @ ${toTitleCase(
          organizationName,
        )} re-invited you to join Pillar`,
        html: emailBody,
      });

      const pk = generateKey(ENTITY_KEY.USER, tenantEmail);
      const sk = generateKey(ENTITY_KEY.USER, ENTITIES.USER);
      await userEntity.updateUser({ pk, sk, status: INVITE_STATUS.RE_INVITED });
    }

    return res.status(API_STATUS.SUCCESS).json({ response: 'true' });
  } catch (error: any) {
    console.log({ error });
    return res
      .status(error?.statusCode || API_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorToResponse(error));
  }
}
