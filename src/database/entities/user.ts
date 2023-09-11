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
}

interface ICreatePMUser extends IBaseUser {
  pmEmail: string;
  pmName: string;
  organization?: string;
}

export interface ICreateTechnician {
  technicianName: string;
  technicianEmail: string;
  status?: InviteStatusType;
  pmEmail: string;
  organization: string;
  organizationName: string;
}

interface ICreatePMUser extends IBaseUser {
  pmEmail: string;
  pmName: string;
  organization?: string;
  organizationName?: string;
}

interface ICreateUser {
  email: string;
}

interface ICreateTenant {
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
  GSI1PK?: string; //PM email
  GSI1SK?: string;
  addresses: Record<string, any>;
  organization?: string;
  organizationName?: string;
  pmEmail?: string;
  pmName?: string;
  roles: Array<'TENANT' | 'PROPERTY_MANAGER' | 'TECHNICIAN'>;
  status?: InviteStatusType;
  technicianEmail?: { type: 'string'; };
  technicianName?: string;
  technicians: { type: 'map'; };
  tenantEmail?: string;
  tenantName?: string;
  tenants: { type: 'map'; };
  userType?: string;
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
          roles: { $add: [userRoles.TENANT] },
          GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.TENANT, lowerCasePMEmail),
          GSI1SK: generateKey(ENTITY_KEY.TENANT, ENTITIES.TENANT),
          GSI4PK: generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.TENANT, organization.toLowerCase()),
          GSI4SK: generateKey(ENTITY_KEY.TENANT, ENTITIES.TENANT),
          tenantEmail: tenantEmail.toLowerCase(),
          tenantName,
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

  public async updateInviteStatus({ pk, sk, status }: { pk: string; sk: string; status: InviteStatusType; }) {
    return (await this.userEntity.update({ pk, sk, status }, { returnValues: "ALL_NEW" })).Attributes;
  }

  //TODO: this isn't set up properly, will need to be updated on ticket where PM view is added
  public async createPropertyManager({ pmEmail, pmName, organization, organizationName }: ICreatePMUser) {
    try {
      const result = await this.userEntity.update(
        {
          pk: generateKey(ENTITY_KEY.USER, pmEmail.toLowerCase()),
          sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
          roles: { $add: [userRoles.PROPERTY_MANAGER] },
          organization,
          organizationName,
        },
        { returnValues: 'ALL_NEW' }
      );
      return result.Attributes;
    } catch (err) {
      console.log({ err });
    }
  }

  public async createTechnician({ technicianName, technicianEmail, pmEmail, organization, organizationName }: ICreateTechnician) {
    try {
      const lowerCasePMEmail = pmEmail.toLowerCase();
      const lowerCaseTechnicianEmail = technicianEmail.toLowerCase();
      const tenant = await this.userEntity.update(
        {
          pk: generateKey(ENTITY_KEY.USER, lowerCaseTechnicianEmail),
          sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
          pmEmail: lowerCasePMEmail,
          roles: { $add: [userRoles.TECHNICIAN] },
          GSI2PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.TECHNICIAN, lowerCasePMEmail),
          GSI2SK: generateKey(ENTITY_KEY.TECHNICIAN, ENTITIES.TECHNICIAN),
          GSI3PK: generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.TECHNICIAN, organization.toLowerCase()),
          GSI3SK: generateKey(ENTITY_KEY.TECHNICIAN, ENTITIES.TECHNICIAN),
          technicianEmail: lowerCaseTechnicianEmail,
          technicianName,
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
  public async get({ email }: { email: string; }) {
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

  public async delete({ pk, sk }: { pk: string; sk: string; }) {
    const params = {
      pk,
      sk,
    };
    const result = await this.userEntity.delete(params);
    return result;
  }

  //Delete a role from roles; also fix GSI1 if needed
  public async deleteRole({ pk, sk, roleToDelete, existingRoles }: { pk: string; sk: string; roleToDelete: string; existingRoles: string[]; }) {
    //If the user will no longer need to be queried by a PM entity, then we should remove those indexes so they dont continue to show up when a pm queries for tenants or technicians in an org
    const isTech: boolean = existingRoles.includes(ENTITIES.TECHNICIAN);
    const isTenant: boolean = existingRoles.includes(ENTITIES.TENANT);
    const shouldDeleteNonPMIndexing: boolean = (roleToDelete === userRoles.TENANT && !isTech) || (roleToDelete === userRoles.TECHNICIAN && !isTenant);

    const params = {
      pk,
      sk,
      ...(shouldDeleteNonPMIndexing && {
        GSI1PK: null,
        GSI1SK: null,
        GSI2PK: null,
        GSI2SK: null,
        GSI3PK: null,
        GSI3SK: null,
        GSI4PK: null,
        GSI4SK: null,
        pmEmail: null,
        pmName: null,
        tenantName: null,
        tenantEmail: null,
        technicianName: null,
        technicianEmail: null,
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
              { attr: 'tenantName', contains: tenantSearchString },
              { or: true, attr: 'tenantEmail', contains: tenantSearchString },
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
    const GSI3PK = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.TECHNICIAN, organization);
    let remainingTechsToFetch = PAGE_SIZE;
    do {
      try {
        const { Items, LastEvaluatedKey } = await this.userEntity.query(GSI3PK, {
          limit: remainingTechsToFetch,
          reverse: true,
          ...(techSearchString && {
            filters: [
              { attr: 'technicianName', contains: techSearchString },
              { or: true, attr: 'technicianEmail', contains: techSearchString },
            ],
          }),
          ...(startKey && { startKey }),
          beginsWith: `${ENTITY_KEY.TECHNICIAN}`,
          index: INDEXES.GSI3,
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
      GSI1PK: { type: 'string' }, //PM tenant
      GSI1SK: { type: 'string' },
      GSI2PK: { type: 'string' }, //PM technician
      GSI2SK: { type: 'string' },
      GSI3PK: { type: 'string' }, //Org technician
      GSI3SK: { type: 'string' },
      GSI4PK: { type: 'string' }, //Org tenant
      GSI4SK: { type: 'string' },
      organization: { type: 'string' },
      organizationName: { type: 'string' },
      pmEmail: { type: 'string' },
      pmName: { type: 'string' },
      propertyManagers: {},
      roles: { type: 'set', required: true },
      status: { type: 'string', required: true },
      technicianName: { type: 'string' },
      technicianEmail: { type: 'string' },
      technicians: { type: 'map' },
      tenantEmail: { type: 'string' },
      tenantName: { type: 'string' },
      tenants: { type: 'map' },
      userType: { type: 'string' },
    },
    table: PillarDynamoTable,
  } as const);
}
