import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey } from '.';
import { INDEXES, PillarDynamoTable } from '..';
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

interface ICreateTenant {
  pmEmail: string;
  tenantEmail: string;
  tenantName: string;
  address: string,
  country: "US" | "CA",
  city: string,
  state: string,
  postalCode: string,
  unit?: string;
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

const userRoles = {
  TECHNICIAN: "technician", // Ability to update Work Orders
  PROPERTY_MANAGER: "propertyManager", // Ability to Add New Tenants, 
  TENANT: "tenant", // Ability to Create and Modify Work Orders
  ORG_OWNER: "orgOwner" // Ability to add PMs, See Org-View of outstanding Work Orders, Technicians, etc. 
};


export class UserEntity {


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
        status: "CREATED"
      }, { returnValues: "ALL_NEW" });
      return result.Attributes;
    } catch (err) {
      console.log({ err });
    }
  }

  /**
   * If user does not already exist, create a new user and give them tenant permissions.
   * If the user does already exist, update them with the appropriate roles + metadata. 
   */
  public async createTenant(
    { pmEmail, tenantName, tenantEmail, address, country, city, state, postalCode, unit }: ICreateTenant) {
    try {
      const lowerCasePMEmail = pmEmail.toLowerCase();
      const lowerCaseTenantEmail = tenantEmail.toLowerCase();
      const tenant = await this.userEntity.update({
        pk: generateKey(ENTITY_KEY.USER, lowerCaseTenantEmail),
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER),
        pmEmail: lowerCasePMEmail,
        roles: { $add: [userRoles.TENANT] },
        GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.TENANT, pmEmail.toLowerCase()),
        GSI1SK: generateKey(ENTITY_KEY.TENANT, ENTITIES.TENANT),
        tenantEmail: tenantEmail.toLowerCase(),
        tenantName,
        status: "INVITED",
        userType: ENTITIES.TENANT,
        addresses: this.generateAddress({
          address,
          country,
          city,
          state,
          postalCode,
          unit,
          isPrimary: true
        }),
      }, { returnValues: "ALL_NEW" });
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
        sk: generateKey(ENTITY_KEY.USER, ENTITIES.USER)
      };
      const result = (await this.userEntity.get(params, { consistent: true })).Item ?? null;
      return result;
    } catch (err) {
      console.log({ err });
      return null;
    }
  }

  public async getAllTenantsForProperyManager({ pmEmail }: { pmEmail: string; }) {
    let startKey: StartKey;
    const tenants = [];
    const GSI1PK = generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.TENANT, pmEmail?.toLowerCase());
    do {
      try {
        const { Items, LastEvaluatedKey } = (await this.userEntity.query(
          GSI1PK,
          {
            limit: 20,
            reverse: true,
            beginsWith: `${ENTITY_KEY.TENANT}#`,
            index: INDEXES.GSI1,
          }
        ));
        startKey = LastEvaluatedKey as StartKey;
        Items?.length && tenants.push(...(Items));
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey);
    return tenants;
  }


  private generateAddress({ address,
    country,
    city,
    state,
    postalCode,
    unit,
    isPrimary
  }: {
    address: string;
    country: string;
    city: string;
    state: string;
    postalCode: string;
    unit?: string;
    isPrimary: boolean;
  }) {
    const unitString = unit ? `- ${unit?.toLowerCase()}` : "";
    const key = `${address.toLowerCase()} ${unitString}`;
    return {
      [key]: { address, unit, city, state, postalCode, country, isPrimary }
    };
  }

  private userEntity = new Entity({
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
      roles: { type: "set", required: true },
      status: { type: "string", required: true },
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
