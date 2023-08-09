import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY } from '.';
import { PillarDynamoTable } from '..';
import { generateKey } from '@/utils';


interface IBaseUser {
  pk: string;
  sk: string;
  email: string;
}

interface ICreatePMUser extends IBaseUser {
  pmEmail: string;
  pmName: string;
  organization: string;
}

interface ICreateUser {
  email: string;
}

export interface IUser extends IBaseUser {
  GSI1PK?: string, //PM email
  GSI1SK?: string,
  addresses: Record<string, any>;
  organization?: string,
  pmEmail?: string;
  pmName?: string;
  roles: Array<"TENANT" | "PROPERTY_MANAGER" | "TECHNICIAN">,
  status?: string;
  technicianName?: string;
  technicians: { type: "map"; },
  tenantEmail?: string;
  tenantName?: string;
  tenants: { type: "map"; },
  userType?: string;
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
   * Creates as new base user entity with no permissions.
   */
  public async createBaseUser(
    { email }: ICreateUser) {
    try {
      const result = await this.userEntity.update({
        pk: generateKey(ENTITY_KEY.USER, email.toLowerCase()),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
        roles: [],
        status: "JOINED"
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  /**
   * Creates as new property manager user entity.
   */
  public async createTenantUser(
    { email }: ICreateUser) {
    try {
      const result = await this.userEntity.update({
        pk: generateKey(ENTITY_KEY.USER, email.toLowerCase()),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
        roles: [roles.TENANT],
        status: "INVITED"
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }



  /**
   * 
   * @param email {string} users email that you wish to return
   * @returns User Object.
   */
  public async get({ email }: { email: string; }) {
    try {
      const params = {
        pk: generateKey(ENTITY_KEY.USER, email.toLowerCase()),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER)
      };
      const result = await this.userEntity.get(params, { consistent: true });
      return result;
    } catch (err) {
      console.log({ err });
      return null;
    }
  }
}
