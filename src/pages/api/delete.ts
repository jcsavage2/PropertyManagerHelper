import { ENTITIES, EntityTypeKeys } from '@/database/entities';
import { EventEntity } from '@/database/entities/event';
import { OrganizationEntity } from '@/database/entities/organization';
import { PropertyEntity } from '@/database/entities/property';
import { IUser, UserEntity, userRoles } from '@/database/entities/user';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { deconstructKey } from '@/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { options } from './auth/[...nextauth]';

export type DeleteRequest = {
  entity: EntityTypeKeys;
  pk: string;
  sk: string;
  madeByEmail: string;
  madeByName: string;
  roleToDelete?: EntityTypeKeys;
  currentUserRoles?: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ response: boolean; }>) {
  const session = await getServerSession(req, res, options);
  //@ts-ignore
  const sessionUser: IUser = session?.user;

  //Tenants and technicians should not be allowed to delete entities
  if (!session || !sessionUser?.roles?.includes(userRoles.PROPERTY_MANAGER)) {
    res.status(401);
    return;
  }
  try {
    const body = req.body as DeleteRequest;
    const { pk, sk, entity, roleToDelete, currentUserRoles, madeByEmail, madeByName } = body;
    if (!pk || !sk || !entity) {
      throw new Error('Invalid params to delete');
    }
    if ((entity === ENTITIES.USER && !roleToDelete) || (entity !== ENTITIES.USER && roleToDelete) || !madeByEmail || !madeByName) {
      throw new Error('Invalid params to delete, when trying to delete a user, you must specify the role to delete');
    }

    let dbEntity:
      | WorkOrderEntity
      | PropertyEntity
      | EventEntity
      | OrganizationEntity
      | UserEntity;
    let deleteEntireEntity = true;
    switch (entity) {
      case ENTITIES.WORK_ORDER:
        dbEntity = new WorkOrderEntity();

        //When work orders are deleted spawn an event
        const eventEntity = new EventEntity();
        await eventEntity.create({
          workOrderId: deconstructKey(pk),
          message: `Work Order Deleted`,
          madeByEmail,
          madeByName,
        });
        break;
      case ENTITIES.PROPERTY:
        dbEntity = new PropertyEntity();
        break;
      case ENTITIES.EVENT:
        dbEntity = new EventEntity();
        break;
      case ENTITIES.ORGANIZATION:
        dbEntity = new OrganizationEntity();
        break;
      case ENTITIES.USER:
        dbEntity = new UserEntity();
        if (!currentUserRoles || !currentUserRoles.length) {
          throw new Error("User doesn't have any roles to delete");
        }

        //If user has more than one role, then we only want to delete the role instead of their entire user record
        if (currentUserRoles.length > 1) {
          deleteEntireEntity = false;
        }
        break;
      default:
        throw new Error('Invalid entity type');
    }

    if (deleteEntireEntity) {
      await dbEntity.delete({ pk, sk });
    } else {
      if (!roleToDelete || entity !== ENTITIES.USER) {
        throw new Error("Can't delete user record unless the entity to delete is a user");
      }
      //@ts-ignore
      await dbEntity.deleteRole({ pk, sk, roleToDelete, existingRoles: currentUserRoles });
    }

    return res.status(200).json({ response: true });
  } catch (error) {
    console.log({ error });
    return res.status(500).json({ response: false });
  }
}
