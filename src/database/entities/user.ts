import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { generateAddress, generateKey } from '@/utils';
import { PAGE_SIZE } from '@/constants';
import { INVITE_STATUS, InviteStatusType } from '@/utils/user-types';

interface IBaseUser {
  pk: string;
  sk: string;
  email: string;
  name: string;
  created: string;
}

export interface ICreateTechnician {
  technicianName: string;
  technicianEmail: string;
  status?: InviteStatusType;
  pmEmail: string;
  pmName: string;
  organization: string;
  organizationName: string;
}

export interface ICreatePMUser {
  userEmail: string;
  userName: string;
  organization: string;
  organizationName: string;
  isAdmin: boolean;
}

interface ICreateUser {
  email: string;
}

interface ICreateTenant {
  pmName: string;
  pmEmail: string;
  tenantEmail: string;
  tenantName: string;
  address: string;
  organization: string;
  organizationName: string;
  country: 'US' | 'CA';
  city: string;
  state: string;
  postalCode: string;
  unit?: string;
  propertyUUId: string;
  numBeds: number;
  numBaths: number;
}

export type UserType = 'TENANT' | 'PROPERTY_MANAGER' | 'TECHNICIAN';

export interface IUser extends IBaseUser {
  pk: string;
  sk: string;
  GSI1PK?: string; //PM tenant
  GSI1SK?: string;
  GSI2PK?: string; //PM technician
  GSI2SK?: string;
  GSI3PK?: string; //Org technician
  GSI3SK?: string;
  GSI4PK?: string; //Org tenant
  GSI4SK?: string;
  addresses: Record<string, any>;
  organization: string;
  organizationName?: string;
  pmEmail?: string;
  pmName?: string;
  roles: Array<'TENANT' | 'PROPERTY_MANAGER' | 'TECHNICIAN'>;
  status: InviteStatusType;
  isAdmin: boolean;
}

export const userRoles = {
  TECHNICIAN: 'TECHNICIAN', // Ability to update Work Orders
  PROPERTY_MANAGER: 'PROPERTY_MANAGER', // Ability to Add New Tenants,
  TENANT: 'TENANT', // Ability to Create and Modify Work Orders
  ORG_OWNER: 'ORG_OWNER', // Ability to add PMs, See Org-View of outstanding Work Orders, Technicians, etc.
} as const;

export class UserEntity {
  /**
   * Creates as new base user entity with no permissions.
   */
  public async createBaseUser({ email }: ICreateUser) {
    try {
      const result = await this.userEntity.update(
        {
          pk: generateKey(ENTITY_KEY.USER, email.toLowerCase()),
          sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
          status: INVITE_STATUS.CREATED,
        },
        { returnValues: 'ALL_NEW' }
      );
      return result.Attributes;
    } catch (err) {
      console.log({ err });
    }
  }

  /**
   * If user does not already exist, create a new user and give them tenant permissions.
   * If the user does already exist, update them with the appropriate roles + metadata.
   */
  public async createTenant({
    pmEmail,
    pmName,
    tenantName,
    organization,
    organizationName,
    tenantEmail,
    address,
    country,
    city,
    state,
    postalCode,
    unit,
    propertyUUId,
    numBeds,
    numBaths,
  }: ICreateTenant) {
    try {
      const lowerCasePMEmail = pmEmail.toLowerCase();
      const lowerCaseTenantEmail = tenantEmail.toLowerCase();
      const tenant = await this.userEntity.update(
        {
          pk: generateKey(ENTITY_KEY.USER, lowerCaseTenantEmail),
          sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
          pmEmail: lowerCasePMEmail,
          pmName,
          roles: { $add: [userRoles.TENANT] },
          GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.TENANT, lowerCasePMEmail),
          GSI1SK: generateKey(ENTITY_KEY.TENANT, ENTITIES.TENANT),
          GSI4PK: generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.TENANT, organization.toLowerCase()),
          GSI4SK: generateKey(ENTITY_KEY.TENANT, ENTITIES.TENANT),
          email: lowerCaseTenantEmail,
          name: tenantName,
          organization,
          organizationName,
          status: INVITE_STATUS.INVITED,
          addresses: generateAddress({
            propertyUUId,
            address,
            country,
            city,
            state,
            postalCode,
            unit,
            isPrimary: true,
            numBaths,
            numBeds,
          }),
        },
        { returnValues: 'ALL_NEW' }
      );
      return tenant.Attributes ?? null;
    } catch (err) {
      console.log({ err });
      return null;
    }
  }

  public async createPropertyManager({ userName, userEmail, organization, organizationName, isAdmin }: ICreatePMUser) {
    try {
      const lowerCaseUserEmail = userEmail.toLowerCase();
      const result = await this.userEntity.update(
        {
          pk: generateKey(ENTITY_KEY.USER, lowerCaseUserEmail),
          sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
          GSI4PK: generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.PROPERTY_MANAGER, organization.toLowerCase()),
          GSI4SK: generateKey(ENTITY_KEY.PROPERTY_MANAGER, ENTITIES.PROPERTY_MANAGER),
          roles: { $add: [userRoles.PROPERTY_MANAGER] },
          email: lowerCaseUserEmail,
          name: userName,
          isAdmin,
          organization,
          organizationName,
          status: INVITE_STATUS.INVITED,
        },
        { returnValues: 'ALL_NEW' }
      );
      return result.Attributes;
    } catch (err) {
      console.log({ err });
    }
  }

  public async createTechnician({ technicianName, technicianEmail, pmEmail, pmName, organization, organizationName }: ICreateTechnician) {
    try {
      const lowerCasePMEmail = pmEmail.toLowerCase();
      const lowerCaseTechnicianEmail = technicianEmail.toLowerCase();
      const tenant = await this.userEntity.update(
        {
          pk: generateKey(ENTITY_KEY.USER, lowerCaseTechnicianEmail),
          sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
          pmEmail: lowerCasePMEmail,
          pmName,
          roles: { $add: [userRoles.TECHNICIAN] },
          GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.TECHNICIAN, lowerCasePMEmail),
          GSI1SK: generateKey(ENTITY_KEY.TECHNICIAN, ENTITIES.TECHNICIAN),
          GSI4PK: generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.TECHNICIAN, organization.toLowerCase()),
          GSI4SK: generateKey(ENTITY_KEY.TECHNICIAN, ENTITIES.TECHNICIAN),
          email: lowerCaseTechnicianEmail,
          name: technicianName,
          organization,
          organizationName,
          status: INVITE_STATUS.INVITED,
        },
        { returnValues: 'ALL_NEW' }
      );
      return tenant.Attributes ?? null;
    } catch (err) {
      console.log({ err });
      return null;
    }
  }

  /**
   * @returns User entity
   */
  public async get({ email }: { email: string }) {
    try {
      const params = {
        pk: generateKey(ENTITY_KEY.USER, email.toLowerCase()),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
      };
      const result = (await this.userEntity.get(params, { consistent: true })).Item ?? null;
      return result;
    } catch (err) {
      console.log({ err });
      return null;
    }
  }

  public async delete({ pk, sk }: { pk: string; sk: string }) {
    const params = {
      pk,
      sk,
    };
    const result = await this.userEntity.delete(params);
    return result;
  }

  //Delete a role from roles, remove the appropriate indexes, and remove the appropriate metadata
  public async deleteRole({ pk, sk, roleToDelete, existingRoles }: { pk: string; sk: string; roleToDelete: string; existingRoles: string[] }) {
    //If the user will no longer need to be queried by a PM entity, then we should remove those indexes so they dont continue to show up when a pm queries for tenants or technicians in an org
    const isTech: boolean = existingRoles.includes(ENTITIES.TECHNICIAN);
    const isTenant: boolean = existingRoles.includes(ENTITIES.TENANT);
    const shouldDeleteIndexing: boolean = (roleToDelete === userRoles.TENANT && !isTech) || (roleToDelete === userRoles.TECHNICIAN && !isTenant);

    const params = {
      pk,
      sk,
      ...(shouldDeleteIndexing && {
        GSI1PK: null,
        GSI1SK: null,
        GSI4PK: null,
        GSI4SK: null,
        pmEmail: null,
        pmName: null,
      }),
      roles: { $delete: [roleToDelete] },
    };
    const result = await this.userEntity.update(params);
    return result;
  }

  public async getAllTenantsForOrg({
    organization,
    tenantSearchString,
    startKey,
  }: {
    organization: string;
    tenantSearchString: string | undefined;
    startKey: StartKey;
  }) {
    const tenants = [];
    const GSI4PK = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.TENANT, organization);
    let remainingTenantsToFetch = PAGE_SIZE;
    do {
      try {
        const { Items, LastEvaluatedKey } = await this.userEntity.query(GSI4PK, {
          limit: remainingTenantsToFetch,
          reverse: true,
          ...(tenantSearchString && {
            filters: [
              { attr: 'name', contains: tenantSearchString },
              { or: true, attr: 'email', contains: tenantSearchString },
            ],
          }),
          ...(startKey && { startKey }),
          beginsWith: `${ENTITY_KEY.TENANT}`,
          index: INDEXES.GSI4,
        });
        startKey = LastEvaluatedKey as StartKey;
        remainingTenantsToFetch -= Items?.length ?? 0;
        Items?.length && tenants.push(...Items);
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey && remainingTenantsToFetch > 0);
    return { tenants, startKey };
  }

  public async getAllTechniciansForOrg({
    organization,
    techSearchString,
    startKey,
  }: {
    organization: string;
    techSearchString: string | undefined;
    startKey: StartKey;
  }) {
    let techs = [];
    const GSI4PK = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.TECHNICIAN, organization);
    let remainingTechsToFetch = PAGE_SIZE;
    do {
      try {
        const { Items, LastEvaluatedKey } = await this.userEntity.query(GSI4PK, {
          limit: remainingTechsToFetch,
          reverse: true,
          ...(techSearchString && {
            filters: [
              { attr: 'name', contains: techSearchString },
              { or: true, attr: 'email', contains: techSearchString },
            ],
          }),
          ...(startKey && { startKey }),
          beginsWith: `${ENTITY_KEY.TECHNICIAN}`,
          index: INDEXES.GSI4,
        });
        startKey = LastEvaluatedKey as StartKey;
        remainingTechsToFetch -= Items?.length ?? 0;
        Items?.length && techs.push(...Items);
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey && remainingTechsToFetch > 0);
    return { techs, startKey };
  }

  public async getAllPMsForOrg({
    organization,
    startKey,
  }: {
    organization: string;
    startKey: StartKey;
  }) {
    let pms = [];
    const GSI4PK = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.PROPERTY_MANAGER, organization);
    let remainingTechsToFetch = PAGE_SIZE;
    do {
      try {
        const { Items, LastEvaluatedKey } = await this.userEntity.query(GSI4PK, {
          limit: remainingTechsToFetch,
          reverse: true,
          ...(startKey && { startKey }),
          beginsWith: `${ENTITY_KEY.PROPERTY_MANAGER}`,
          index: INDEXES.GSI4,
        });
        startKey = LastEvaluatedKey as StartKey;
        remainingTechsToFetch -= Items?.length ?? 0;
        Items?.length && pms.push(...Items);
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey && remainingTechsToFetch > 0);
    return { pms, startKey };
  }

  /**
   * Adds a new address to the user's address map.
   */
  public async addAddress({
    tenantEmail,
    propertyUUId,
    address,
    country = 'US',
    city,
    state,
    postalCode,
    unit,
    numBeds,
    numBaths,
  }: {
    tenantEmail: string;
    propertyUUId: string;
    address: string;
    country: string;
    city: string;
    state: string;
    postalCode: string;
    numBeds: number;
    numBaths: number;
    unit?: string;
  }) {
    try {
      //get current address map
      const userAccount = await this.get({ email: tenantEmail });
      if (!userAccount) {
        throw new Error('tenant.addAddress error: Tenant not found: {' + tenantEmail + '}');
      }
      //@ts-ignore
      let newAddresses: Record<string, any> = userAccount.addresses;

      //Add new address into the map
      newAddresses[propertyUUId] = { address, unit, city, state, postalCode, country, isPrimary: false, numBeds, numBaths };

      //Add the map with the new address back into the tenant record
      const result = await this.userEntity.update(
        {
          pk: generateKey(ENTITY_KEY.USER, tenantEmail.toLowerCase()),
          sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
          addresses: newAddresses,
        },
        { returnValues: 'ALL_NEW' }
      );
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  private userEntity = new Entity({
    name: ENTITIES.USER,
    attributes: {
      pk: { partitionKey: true },
      sk: { sortKey: true },
      addresses: { type: 'map' },
      GSI1PK: { type: 'string' }, //PM
      GSI1SK: { type: 'string' },
      GSI2PK: { type: 'string' }, //Tenant
      GSI2SK: { type: 'string' },
      GSI3PK: { type: 'string' }, //Technician
      GSI3SK: { type: 'string' },
      GSI4PK: { type: 'string' }, //Org
      GSI4SK: { type: 'string' },
      organization: { type: 'string', required: true },
      organizationName: { type: 'string', required: true },
      pmEmail: { type: 'string' },
      pmName: { type: 'string' },
      email: { type: 'string', required: true },
      name: { type: 'string', required: true },
      isAdmin: { type: 'boolean' },
      roles: { type: 'set', required: true },
      status: { type: 'string', required: true },
      technicians: { type: 'map' },
      tenants: { type: 'map' },
      propertyManagers: { type: 'map' },
    },
    table: PillarDynamoTable,
  } as const);
}
