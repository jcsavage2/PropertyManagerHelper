import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey, createAddressString, generateAddressSk } from '.';
import { INDEXES, MAX_RETRIES, PillarDynamoTable } from '..';
import { generateKey } from '@/utils';
import { API_STATUS, INVITE_STATUS, NO_EMAIL_PREFIX, PAGE_SIZE } from '@/constants';
import { CreatePMSchemaType, InviteStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '@/pages/api/_types';

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
  status?: InviteStatus;
  pmEmail: string;
  pmName: string;
  organization: string;
  organizationName: string;
}

interface ICreateUser {
  email: string;
}

interface ICreateTenant {
  pmName: string;
  pmEmail: string;
  tenantEmail?: string;
  tenantName: string;
  address: string;
  organization: string;
  organizationName: string;
  phone?: string;
  country: string;
  city: string;
  state: string;
  postalCode: string;
  unit?: string;
  propertyUUId: string;
  numBeds: number;
  numBaths: number;
}

export const USER_TYPE = {
  TECHNICIAN: 'TECHNICIAN',
  PROPERTY_MANAGER: 'PROPERTY_MANAGER',
  TENANT: 'TENANT',
} as const;

export type UserType = (typeof USER_TYPE)[keyof typeof USER_TYPE];

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
  addressString: string;
  organization: string;
  organizationName?: string;
  pmEmail?: string;
  pmName?: string;
  hasSeenDownloadPrompt?: boolean;
  phone?: string;
  roles: Array<UserType>;
  status: InviteStatus;
  isAdmin: boolean;
  altNames: string[];
  version?: number;
}

export type Attributes =
  | 'addresses'
  | 'addressString'
  | 'GSI1PK'
  | 'GSI1SK'
  | 'GSI2PK'
  | 'GSI2SK'
  | 'GSI3PK'
  | 'GSI3SK'
  | 'GSI4PK'
  | 'GSI4SK'
  | 'hasSeenDownloadPrompt'
  | 'pmEmail'
  | 'pmName'
  | 'phone'
  | 'altNames'
  | 'isAdmin'
  | 'version';

export class UserEntity {
  /**
   * Creates as new base user entity with no permissions.
   */
  public async createBaseUser({ email }: ICreateUser) {
    const result = await this.userEntity.update(
      {
        pk: generateKey(ENTITY_KEY.USER, email),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
        status: INVITE_STATUS.CREATED,
      },
      { returnValues: 'ALL_NEW' }
    );
    return result.Attributes;
  }

  /**
   * Create a new user and give them tenant permissions.
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
    phone,
    state,
    postalCode,
    unit,
    propertyUUId,
    numBeds,
    numBaths,
  }: ICreateTenant) {
    if (tenantEmail?.startsWith(NO_EMAIL_PREFIX)) {
      throw new Error('Cannot create a user with this account');
    }
    const guaranteedEmail = tenantEmail ?? `${NO_EMAIL_PREFIX}${uuidv4()}@gmail.com`;
    const tenant = await this.userEntity.update(
      {
        pk: generateKey(ENTITY_KEY.USER, guaranteedEmail),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
        pmEmail,
        pmName,
        roles: { $add: [USER_TYPE.TENANT] },
        GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.TENANT, pmEmail),
        GSI1SK: generateKey(ENTITY_KEY.TENANT, ENTITIES.TENANT),
        GSI4PK: generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.TENANT, organization),
        GSI4SK: this.createGSI4SK({
          email: guaranteedEmail,
          entityKey: ENTITY_KEY.TENANT,
          address,
          city,
          country,
          state,
          postalCode,
          unit,
        }),
        email: guaranteedEmail,
        name: tenantName,
        organization,
        phone,
        organizationName,
        status: INVITE_STATUS.INVITED,
        addresses: {
          [propertyUUId]: { address, unit, city, state, postalCode, country, isPrimary: true, numBeds, numBaths },
        },
        addressString: createAddressString({ address, city, state, postalCode, unit }),
        version: 1,
      },
      { returnValues: 'ALL_NEW' }
    );
    return tenant.Attributes ?? null;
  }

  /**
   * Updates fields on a user entity with version control
   */
  public async updateUser({
    pk,
    sk,
    hasSeenDownloadPrompt,
    status,
    addresses,
    addressString,
    GSI4SK,
    version,
    toRemove = [],
  }: {
    pk: string;
    sk: string;
    hasSeenDownloadPrompt?: boolean;
    status?: InviteStatus;
    addresses?: Record<string, any>;
    addressString?: string;
    GSI4SK?: string;
    version: number;
    toRemove?: Attributes[]; //Array of attributes to remove as strings
  }): Promise<{ user: any; err: any }> {
    try {
      const updatedUser = await this.userEntity.update(
        {
          pk,
          sk,
          ...(GSI4SK && { GSI4SK }),
          ...(hasSeenDownloadPrompt && { hasSeenDownloadPrompt }),
          ...(status && { status }),
          ...(addresses && { addresses }),
          ...(addressString && { addressString }),
          version: version + 1,
          $remove: toRemove,
        },
        {
          conditions: [
            { attr: 'version', eq: version },
            { or: true, attr: 'version', exists: false },
          ],
          returnValues: 'ALL_NEW',
        }
      );
      return Promise.resolve({ user: updatedUser.Attributes ?? null, err: null });
    } catch (err) {
      return Promise.resolve({ user: null, err });
    }
  }

  public async createPropertyManager({ userName, userEmail, organization, organizationName, isAdmin }: CreatePMSchemaType) {
    const result = await this.userEntity.update(
      {
        pk: generateKey(ENTITY_KEY.USER, userEmail),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
        GSI4PK: generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.PROPERTY_MANAGER, organization),
        GSI4SK: generateKey(ENTITY_KEY.PROPERTY_MANAGER, ENTITIES.PROPERTY_MANAGER),
        roles: { $add: [USER_TYPE.PROPERTY_MANAGER] },
        email: userEmail,
        name: userName,
        isAdmin,
        organization,
        organizationName,
        status: INVITE_STATUS.INVITED,
        version: 1,
      },
      { returnValues: 'ALL_NEW' }
    );
    return result.Attributes;
  }

  public async createTechnician({ technicianName, technicianEmail, pmEmail, pmName, organization, organizationName }: ICreateTechnician) {
    const tenant = await this.userEntity.update(
      {
        pk: generateKey(ENTITY_KEY.USER, technicianEmail),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
        pmEmail,
        pmName,
        roles: { $add: [USER_TYPE.TECHNICIAN] },
        GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.TECHNICIAN, pmEmail),
        GSI1SK: generateKey(ENTITY_KEY.TECHNICIAN, ENTITIES.TECHNICIAN),
        GSI4PK: generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.TECHNICIAN, organization),
        GSI4SK: generateKey(ENTITY_KEY.TECHNICIAN, ENTITIES.TECHNICIAN),
        email: technicianEmail,
        name: technicianName,
        organization,
        organizationName,
        status: INVITE_STATUS.INVITED,
        version: 1,
      },
      { returnValues: 'ALL_NEW' }
    );
    return tenant.Attributes ?? null;
  }

  /**
   * @returns User entity
   */
  public async get({ email }: { email: string }) {
    const params = {
      pk: generateKey(ENTITY_KEY.USER, email),
      sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
    };
    const result = (await this.userEntity.get(params, { consistent: true })).Item ?? null;
    return result;
  }

  /**
   * @returns User entities
   */
  public async getMany({ emails }: { emails: string[] }) {
    let userList = [];
    for (const email of emails) {
      const params = {
        pk: generateKey(ENTITY_KEY.USER, email),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
      };
      const result = (await this.userEntity.get(params, { consistent: true })).Item;
      if (!result) throw new Error('User not found: ' + email);
      userList.push(result);
    }
    return userList;
  }

  public async delete({ pk, sk }: { pk: string; sk: string }) {
    const params = {
      pk,
      sk,
    };
    const result = await this.userEntity.delete(params);
    return result;
  }

  //Delete a role from roles; also fix GSI1 if needed
  public async deleteRole({ pk, sk, roleToDelete, existingRoles }: { pk: string; sk: string; roleToDelete: string; existingRoles: string[] }) {
    //If the user will no longer need to be queried by a PM entity, then we should remove those indexes so they dont continue to show up when a pm queries for tenants or technicians in an org
    const isTech: boolean = existingRoles.includes(ENTITIES.TECHNICIAN);
    const isTenant: boolean = existingRoles.includes(ENTITIES.TENANT);
    const shouldDeleteIndexing: boolean = (roleToDelete === USER_TYPE.TENANT && !isTech) || (roleToDelete === USER_TYPE.TECHNICIAN && !isTenant);

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
    statusFilter,
    startKey,
    fetchAllTenants,
  }: {
    organization: string;
    tenantSearchString: string | undefined;
    statusFilter?: Record<'JOINED' | 'INVITED' | 'RE_INVITED', boolean>;
    startKey: StartKey;
    fetchAllTenants?: boolean;
  }) {
    const tenants: any[] = [];
    const GSI4PK = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.TENANT, organization);
    let remainingTenantsToFetch = PAGE_SIZE;
    do {
      const { Items, LastEvaluatedKey } = await this.userEntity.query(GSI4PK, {
        limit: remainingTenantsToFetch,
        reverse: false,
        ...(statusFilter &&
          !fetchAllTenants && {
            filters: this.constructGetTenantFilters({ statusFilter, tenantSearchString }),
          }),
        ...(startKey && { startKey }),
        beginsWith: `${ENTITY_KEY.TENANT}`,
        index: INDEXES.GSI4,
      });
      startKey = LastEvaluatedKey as StartKey;
      remainingTenantsToFetch -= Items?.length ?? 0;
      Items?.length && tenants.push(...Items);
    } while ((!!startKey && remainingTenantsToFetch > 0) || (!!startKey && fetchAllTenants));

    return { tenants, startKey };
  }

  private constructGetTenantFilters({
    statusFilter,
    tenantSearchString,
  }: {
    statusFilter: Record<'JOINED' | 'INVITED' | 'RE_INVITED', boolean>;
    tenantSearchString: string | undefined;
  }): any[] {
    const filters = [];
    const statusFilters = (Object.keys(statusFilter) as ('JOINED' | 'INVITED' | 'RE_INVITED')[]).filter((k) => statusFilter[k]);

    // Status filter logic
    statusFilters.length < 3 && filters.push({ attr: 'status', in: statusFilters });

    //Search string logic
    if (tenantSearchString) {
      filters.push([
        { attr: 'name', contains: tenantSearchString },
        { or: true, attr: 'email', contains: tenantSearchString },
        { or: true, attr: 'addressString', contains: tenantSearchString.toUpperCase() },
      ]);
    }
    return filters;
  }

  public async getAllTechniciansForOrg({ organization, techSearchString, startKey }: { organization: string; techSearchString: string | undefined; startKey: StartKey }) {
    let techs = [];
    const GSI4PK = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.TECHNICIAN, organization);
    let remainingTechsToFetch = PAGE_SIZE;
    do {
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
    } while (!!startKey && remainingTechsToFetch > 0);
    return { techs, startKey };
  }

  public async getAllPMsForOrg({ organization, startKey }: { organization: string; startKey: StartKey }) {
    let pms = [];
    const GSI4PK = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.PROPERTY_MANAGER, organization);
    let remainingTechsToFetch = PAGE_SIZE;
    do {
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
    } while (!!startKey && remainingTechsToFetch > 0);
    return { pms, startKey };
  }

  /**
   * Adds a new address to the user's address map. Adds new address string to user's address string.
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
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      //get current address map and address string
      const userAccount = await this.get({ email: tenantEmail });
      if (!userAccount) return null;

      const numAddresses = Object.keys(userAccount.addresses ?? {}).length;
      //@ts-ignore
      let newAddresses: Record<string, any> = userAccount.addresses;

      let newAddressString: string = userAccount.addressString ?? '';
      newAddressString += createAddressString({ address, city, state, postalCode, unit });

      //Add new address into the map
      newAddresses[propertyUUId] = {
        address,
        unit,
        city,
        state,
        postalCode,
        country,
        isPrimary: numAddresses === 0, //If they have no other addresses, then their only address becomes primary
        numBeds,
        numBaths,
      };

      //If this is their first address, then set GSI4SK
      let newGSI4SK: string | undefined = undefined;
      if (numAddresses === 0) {
        newGSI4SK = this.createGSI4SK({
          email: tenantEmail,
          entityKey: ENTITY_KEY.TENANT,
          address,
          city,
          country,
          state,
          postalCode,
          unit,
        });
      }

      //Add the map with the new address back into the tenant record
      const { user, err } = await this.updateUser({
        pk: generateKey(ENTITY_KEY.USER, tenantEmail),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
        addresses: newAddresses,
        addressString: newAddressString,
        GSI4SK: newGSI4SK,
        version: userAccount.version ?? 1,
      });

      if (err) {
        attempt++;
        continue;
      }
      return user;
    }
    throw new ApiError(API_STATUS.INTERNAL_SERVER_ERROR, 'Failed to add address after maximum retries');
  }

  /**
   * Edits an existing address in the user's address map. Updates user's address string.
   */
  public async editAddress({
    tenantEmail,
    propertyUUId,
    address,
    country,
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
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      const tenant = await this.get({ email: tenantEmail });
      if (!tenant) return null;

      let addressesMap = tenant?.addresses;
      const oldIsPrimary = addressesMap[propertyUUId]?.isPrimary ?? false;
      addressesMap[propertyUUId] = {
        address,
        city,
        state,
        postalCode,
        unit,
        country,
        isPrimary: oldIsPrimary,
        numBeds,
        numBaths,
      };

      //Have to recreate address string from scratch
      let newAddressString: string = '';
      let GSI4SK: string = '';
      Object.keys(addressesMap).forEach((key: string) => {
        const property = addressesMap[key];
        newAddressString += createAddressString({
          address: property.address,
          city: property.city,
          state: property.state,
          postalCode: property.postalCode,
          unit: property.unit,
        });

        if (property.isPrimary) {
          GSI4SK = this.createGSI4SK({
            email: tenantEmail,
            entityKey: ENTITY_KEY.TENANT,
            address: property.address,
            city: property.city,
            country: property.country,
            state: property.state,
            postalCode: property.postalCode,
            unit: property.unit,
          });
        }
      });

      const { user, err } = await this.updateUser({
        pk: generateKey(ENTITY_KEY.USER, tenantEmail),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
        addresses: addressesMap,
        addressString: newAddressString,
        GSI4SK,
        version: tenant.version ?? 1,
      });

      if (err && err.$metadata?.httpStatusCode === API_STATUS.BAD_REQUEST) {
        attempt++;
        continue;
      }
      return user;
    }
    throw new ApiError(API_STATUS.INTERNAL_SERVER_ERROR, 'Failed to edit address after maximum retries');
  }

  /**
   * Removes an address from the user's address map. Updates user's address string.
   */
  public async removeAddress({ tenantEmail, propertyUUId }: { tenantEmail: string; propertyUUId: string }) {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      const tenant = await this.get({ email: tenantEmail });
      if (!tenant) return null;

      let addressesMap = tenant?.addresses;
      delete addressesMap[propertyUUId];

      //Have to recreate address string from scratch
      let newAddressString: string = '';
      let GSI4SK: string | undefined = undefined;
      const mapLength = Object.keys(addressesMap).length;
      Object.keys(addressesMap).forEach((key: string, index: number) => {
        const property = addressesMap[key];
        newAddressString += createAddressString({
          address: property.address,
          city: property.city,
          state: property.state,
          postalCode: property.postalCode,
          unit: property.unit,
        });

        if (property.isPrimary) {
          GSI4SK = this.createGSI4SK({
            email: tenantEmail,
            entityKey: ENTITY_KEY.TENANT,
            address: property.address,
            city: property.city,
            country: property.country,
            state: property.state,
            postalCode: property.postalCode,
            unit: property.unit,
          });
        }

        //If we deleted their primary property, then we need to set a new one
        //For now just pick the most recent one in the map
        if (index === mapLength - 1 && !GSI4SK) {
          addressesMap[key].isPrimary = true;
          GSI4SK = this.createGSI4SK({
            email: tenantEmail,
            entityKey: ENTITY_KEY.TENANT,
            address: property.address,
            city: property.city,
            country: property.country,
            state: property.state,
            postalCode: property.postalCode,
            unit: property.unit,
          });
        }
      });

      //If we deleted the last address in their map, then we need to set GSI4SK to just their email
      if (!GSI4SK) {
        GSI4SK = ENTITY_KEY.TENANT + '#' + tenantEmail;
      }

      const { user, err } = await this.updateUser({
        pk: generateKey(ENTITY_KEY.USER, tenantEmail),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
        addresses: addressesMap,
        addressString: newAddressString,
        GSI4SK,
        toRemove: !newAddressString.length ? ['addressString'] : [],
        version: tenant.version ?? 1,
      });

      if (err && err.$metadata?.httpStatusCode === API_STATUS.BAD_REQUEST) {
        attempt++;
        continue;
      }
      return user;
    }
    throw new ApiError(API_STATUS.INTERNAL_SERVER_ERROR, 'Failed to remove address after maximum retries');
  }

  private createGSI4SK = ({
    email,
    entityKey,
    address,
    city,
    country,
    state,
    postalCode,
    unit,
  }: {
    email: string;
    entityKey: string;
    address: string;
    city: string;
    country: string;
    state: string;
    postalCode: string;
    unit?: string;
  }) => {
    return (
      generateAddressSk({
        entityKey,
        address,
        city,
        country,
        state,
        postalCode,
        unit,
      }) +
      '#' +
      email
    );
  };

  private userEntity = new Entity({
    name: ENTITIES.USER,
    attributes: {
      pk: { partitionKey: true },
      sk: { sortKey: true },
      addresses: { type: 'map' },
      addressString: { type: 'string' },
      GSI1PK: { type: 'string' }, //PM
      GSI1SK: { type: 'string' },
      GSI2PK: { type: 'string' }, //Tenant
      GSI2SK: { type: 'string' },
      GSI3PK: { type: 'string' }, //Technician
      GSI3SK: { type: 'string' },
      GSI4PK: { type: 'string' }, //Org
      GSI4SK: { type: 'string' },
      hasSeenDownloadPrompt: { type: 'boolean' },
      organization: { type: 'string', required: true },
      organizationName: { type: 'string', required: true },
      pmEmail: { type: 'string' },
      pmName: { type: 'string' },
      phone: { type: 'string' },
      email: { type: 'string', required: true },
      name: { type: 'string', required: true },
      altNames: { type: 'list' },
      isAdmin: { type: 'boolean' },
      roles: { type: 'set', required: true },
      status: { type: 'string', required: true },
      version: { type: 'number' },
    },
    table: PillarDynamoTable,
  } as const);
}
