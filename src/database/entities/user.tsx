import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY } from '.';
import { PillarDynamoTable } from '..';
import { generateKey } from '@/utils';


interface IBaseUser {
  pk: string;
  sk: string;
}

interface ICreatePMUser extends IBaseUser {
  pmEmail: string;
  pmName: string;
  organization: string;
}

interface ICreateUser {
  email: string;
}



const roles = {
  TECHNICIAN: "technician", // Ability to update Work Orders
  PROPERTY_MANAGER: "propertyManager", // Ability to Add New Tenants, 
  TENANT: "tenant", // Ability to Create and Modify Work Orders
  ORG_OWNER: "orgOwner" // Ability to add PMs, See Org-View of outstanding Work Orders, Technicians, etc. 
};


export class UserEntity {
  private userEntity: Entity;

  constructor() {
    this.userEntity = new Entity({
      name: ENTITIES.USER,
      attributes: {
        pk: { partitionKey: true },
        sk: { sortKey: true },
        addresses: { type: "map" },
        GSI1PK: { type: "string" }, //PM email
        GSI1SK: { type: "string" },
        organization: { type: "string" },
        pmEmail: { type: "string" },
        pmName: { type: "string" },
        propertyManagers: {},
        roles: { type: "list" },
        status: { type: "string" },
        technicianName: { type: "string" },
        technicians: { type: "map" },
        tenantEmail: { type: "string" },
        tenantName: { type: "string" },
        tenants: { type: "map" },
        userType: { type: "string" },
      },
      table: PillarDynamoTable
    } as const);
  }


  /**
   * Creates as new property manager user entity.
   */
  public async create(
    { email }: ICreateUser) {
    try {
      const result = await this.userEntity.update({
        pk: generateKey(ENTITY_KEY.USER, email.toLowerCase()),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
        roles: [roles.PROPERTY_MANAGER],
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async get({ email }: { email: string; }) {
    try {
      const params = {
        pk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, email.toLowerCase()),
        sk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, ENTITIES.PROPERTY_MANAGER)
      };
      const result = await this.userEntity.get(params, { consistent: true });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async update(
    { email, name, organization, tenants, properties }:
      { email: string; name?: string; organization?: string; tenants?: string[], properties?: string[]; }) {
    try {
      const result = await this.userEntity.update({
        pk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, email.toLowerCase()),
        sk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, ENTITIES.PROPERTY_MANAGER),
        pmEmail: email.toLowerCase(),
        ...(name && { name, }),
        ...(organization && { organization }),
        userType: ENTITIES.PROPERTY_MANAGER
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }
}
