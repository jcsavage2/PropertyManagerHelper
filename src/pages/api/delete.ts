import { ENTITIES, EntityTypeKeys } from '@/database/entities';
import { EventEntity } from '@/database/entities/event';
import { OrganizationEntity } from '@/database/entities/organization';
import { PropertyEntity } from '@/database/entities/property';
import { PropertyManagerEntity } from '@/database/entities/property-manager';
import { TechnicianEntity } from '@/database/entities/technician';
import { TenantEntity } from '@/database/entities/tenant';
import { UserEntity } from '@/database/entities/user';
import { WorkOrderEntity } from '@/database/entities/work-order';
import { NextApiRequest, NextApiResponse } from 'next';

export type DeleteRequest = {
  entity: EntityTypeKeys;
  pk: string;
  sk: string;
  roleToDelete?: EntityTypeKeys;
  currentUserRoles?: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ response: boolean }>) {
  try {
    const body = req.body as DeleteRequest;
    const { pk, sk, entity, roleToDelete, currentUserRoles } = body;
    if (!pk || !sk || !entity) {
      throw new Error('Invalid params to delete');
    }
    if ((entity === ENTITIES.USER && !roleToDelete) || (entity !== ENTITIES.USER && roleToDelete)) {
      throw new Error('Invalid params to delete, when trying to delete a user, you must specify the role to delete');
    }

    let dbEntity:
      | WorkOrderEntity
      | TenantEntity
      | PropertyManagerEntity
      | TechnicianEntity
      | PropertyEntity
      | EventEntity
      | OrganizationEntity
      | UserEntity;
    let deleteEntireEntity = true;
    switch (entity) {
      case ENTITIES.WORK_ORDER:
        dbEntity = new WorkOrderEntity();
        break;
      case ENTITIES.TENANT:
        dbEntity = new TenantEntity();
        break;
      case ENTITIES.PROPERTY_MANAGER:
        dbEntity = new PropertyManagerEntity();
        break;
      case ENTITIES.TECHNICIAN:
        dbEntity = new TechnicianEntity();
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
      console.log('Deleteing an entire record: ', { pk, sk, roleToDelete });
      await dbEntity.delete({ pk, sk });
    } else {
      if (!roleToDelete || entity !== ENTITIES.USER) {
        throw new Error("Can't delete user record unless the entity to delete is a user");
      }
      console.log('Deleteing a single role: ', { pk, sk, roleToDelete });
      //@ts-ignore
      await dbEntity.deleteRole({ pk, sk, roleToDelete, existingRoles: currentUserRoles });
    }

    return res.status(200).json({ response: true });
  } catch (error) {
    console.log({ error });
    return res.status(500).json({ response: false });
  }
}
