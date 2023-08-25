import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { generateAddress, generateKey, toTitleCase } from '@/utils';
import { GetCommandInput } from '@aws-sdk/lib-dynamodb';


interface IBaseUser {
  pk: string;
  sk: string;
  email: string;
}

interface ICreatePMUser extends IBaseUser {
  pmEmail: string;
  pmName: string;
  organization?: string;
}

export interface ICreateTechnician {
  technicianName: string;
  technicianEmail: string;
  status?: "JOINED" | "INVITED";
  pmEmail: string;
  organization: string;
};

interface ICreatePMUser extends IBaseUser {
  pmEmail: string;
  pmName: string;
  organization?: string;
  organizationName?: string;
};

interface ICreateUser {
  email: string;
}

interface ICreateTenant {
  pmEmail: string;
  tenantEmail: string;
  tenantName: string;
  address: string,
  organization?: string,
  country: "US" | "CA",
  city: string,
  state: string,
  postalCode: string,
  unit?: string;
  propertyUUId: string;
  numBeds: number;
  numBaths: number;
}

export interface IUser extends IBaseUser {
  GSI1PK?: string, //PM email
  GSI1SK?: string,
  addresses: Record<string, any>;
  organization?: string,
  organizationName?: string,
  pmEmail?: string;
  pmName?: string;
  roles: Array<"TENANT" | "PROPERTY_MANAGER" | "TECHNICIAN">,
  status?: string;
  technicianEmail?: { type: "string"; };
  technicianName?: string;
  technicians: { type: "map"; },
  tenantEmail?: string;
  tenantName?: string;
  tenants: { type: "map"; },
  userType?: string;
}

export const userRoles = {
  TECHNICIAN: "TECHNICIAN", // Ability to update Work Orders
  PROPERTY_MANAGER: "PROPERTY_MANAGER", // Ability to Add New Tenants, 
  TENANT: "TENANT", // Ability to Create and Modify Work Orders
  ORG_OWNER: "ORG_OWNER" // Ability to add PMs, See Org-View of outstanding Work Orders, Technicians, etc. 
} as const;


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
    { pmEmail, tenantName, organization, tenantEmail, address, country, city, state, postalCode, unit, propertyUUId, numBeds, numBaths }: ICreateTenant) {
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
        organization,
        status: "INVITED",
        userType: ENTITIES.TENANT,
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
          numBeds
        }),
      }, { returnValues: "ALL_NEW" });
      return tenant.Attributes ?? null;
    } catch (err) {
      console.log({ err });
      return null;
    }
  }

  public async createPropertyManager({ pmEmail, pmName, organization, organizationName }: ICreatePMUser) {
    try {
      const result = await this.userEntity.update({
        pk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, pmEmail.toLowerCase()),
        sk: generateKey(ENTITY_KEY.PROPERTY_MANAGER, ENTITIES.PROPERTY_MANAGER),
        pmEmail: pmEmail.toLowerCase(),
        pmName,
        organization,
        organizationName,
        userType: ENTITIES.PROPERTY_MANAGER
      }, { returnValues: "ALL_NEW" });
      return result.Attributes;
    } catch (err) {
      console.log({ err });
    }
  }

  public async createTechnician(
    { technicianName, technicianEmail, pmEmail, organization }: ICreateTechnician) {
    try {
      /**
       * We first need to attempt to create the Technician.
       * If the technician already exists, we must only update the value of the propertyManager map and the GSI1PK/GSI1SK.
       * We need one consistent profile though so that when the technician comes to the app, 
       * they are able to fetch their profile with pk and sk (with their email alone).
       * We must additionally create a companion row with the Property Manager email as the SK
       * so we are able to perform the getAll technicians for 
       */
      const { Attributes } = await this.userEntity.update({
        pk: generateKey(ENTITY_KEY.TECHNICIAN, technicianEmail?.toLowerCase()),
        sk: generateKey(ENTITY_KEY.TECHNICIAN, technicianEmail?.toLowerCase()),
        organization,
        ...(pmEmail && {
          propertyManagers: {
            $add: [pmEmail.toLowerCase()]
          }
        }),
        status: "INVITED",
        technicianEmail: technicianEmail.toLowerCase(),
        technicianName: toTitleCase(technicianName),
        userType: "TECHNICIAN",
      }, { returnValues: "ALL_NEW" });


      // Create Companion Row
      await this.userEntity.update({
        pk: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.TECHNICIAN, pmEmail?.toLowerCase()),
        sk: generateKey(ENTITY_KEY.TECHNICIAN, technicianEmail.toLowerCase()),
        technicianEmail: technicianEmail.toLowerCase(),
        technicianName: toTitleCase(technicianName)
      });
      return Attributes ?? null;
    } catch (err) {
      console.log({ err });
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

  public async getAllTechniciansForProperyManager({ pmEmail }: { pmEmail: string; }) {
    let startKey: StartKey;
    const technicians = [];
    do {
      try {
        const { Items, LastEvaluatedKey } = await this.userEntity.query(
          generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.TECHNICIAN, pmEmail?.toLowerCase()),
          {
            limit: 20,
            reverse: true,
            beginsWith: `${ENTITY_KEY.TECHNICIAN}#`,
          }
        );
        startKey = LastEvaluatedKey as StartKey;
        Items?.length && technicians.push(...Items);
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey);
    return technicians;
  }

  /**
   * Adds a new address to the user's address map.
   */
  public async addAddress({
    tenantEmail,
    propertyUUId,
    address,
    country = "US",
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
        throw new Error("tenant.addAddress error: Tenant not found: {" + tenantEmail + "}");
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
          addresses: newAddresses
        },
        { returnValues: "ALL_NEW" }
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
      addresses: { type: "map" },
      GSI1PK: { type: "string" }, //PM email
      GSI1SK: { type: "string" },
      organization: { type: "string" },
      organizationName: { type: "string" },
      pmEmail: { type: "string" },
      pmName: { type: "string" },
      propertyManagers: {},
      roles: { type: "set", required: true },
      status: { type: "string", required: true },
      technicianName: { type: "string" },
      technicianEmail: { type: "string" },
      technicians: { type: "map" },
      tenantEmail: { type: "string" },
      tenantName: { type: "string" },
      tenants: { type: "map" },
      userType: { type: "string" },
    },
    table: PillarDynamoTable
  } as const);
}