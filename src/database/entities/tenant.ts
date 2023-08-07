import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { generateKey } from '@/utils';


export interface ITenant {
  pk: string,
  sk: string,
  GSI1PK: string,
  created: string,
  GSI1SK: string,
  pmEmail: string,
  status: string,
  tenantEmail: string,
  tenantName: string,
  userType: string,
  addresses: Map<string, any>,
}

export type CreateTenantProps = {
  tenantEmail: string;
  tenantName: string;
  pmEmail: string;
  address: string;
  country: string;
  city: string;
  state: string;
  postalCode: string;
  beds: number | null;
  baths: number | null;
  unit?: string;
};

export class TenantEntity {
  private tenant: Entity;

  constructor() {
    this.tenant = new Entity({
      name: ENTITIES.TENANT,
      attributes: {
        pk: { partitionKey: true },
        sk: { sortKey: true },
        GSI1PK: { type: "string" }, //PM email
        GSI1SK: { type: "string" },
        pmEmail: { type: "string" },
        status: { type: "string" },
        tenantEmail: { type: "string" },
        tenantName: { type: "string" },
        userType: { type: "string" },
        addresses: { type: "map" },
      },
      table: PillarDynamoTable
    } as const);
  }

  private generateAddress({ address,
    country,
    city,
    state,
    postalCode,
    unit,
    isPrimary,
    numBeds,
    numBaths
  }: {
    address: string;
    country: string;
    city: string;
    state: string;
    postalCode: string;
    isPrimary: boolean;
    unit?: string;
    numBeds?: number;
    numBaths?: number;
  }) {
    const unitString = unit ? `- ${unit?.toLowerCase()}` : "";
    const key = `${address.toLowerCase()} ${unitString}`;
    return {
      [key]: { address, unit, city, state, postalCode, country, isPrimary, numBeds, numBaths }
    };
  }

  /**
   * Creates the user record in the Database.
   */
  public async create(
    {
      tenantEmail,
      tenantName,
      pmEmail,
      address,
      country,
      city,
      state,
      postalCode,
      unit,
      beds,
      baths
    }: CreateTenantProps) {
    try {
      const result = await this.tenant.update({
        pk: generateKey(ENTITY_KEY.TENANT, tenantEmail.toLowerCase()),
        sk: generateKey(ENTITY_KEY.TENANT, ENTITIES.TENANT),
        GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.TENANT, pmEmail.toLowerCase()),
        GSI1SK: generateKey(ENTITY_KEY.TENANT, ENTITIES.TENANT),
        tenantEmail: tenantEmail.toLowerCase(),
        tenantName,
        ...(pmEmail && { pmEmail: pmEmail?.toLowerCase() }),
        status: "INVITED",
        userType: ENTITIES.TENANT,
        addresses: this.generateAddress({
          address,
          country,
          city,
          state,
          postalCode,
          unit,
          isPrimary: true,
          ...(beds && { numBeds: beds }),
          ...(baths && { numBaths: baths }),
        }),
      }, { returnValues: "ALL_NEW", strictSchemaCheck: true });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  /**
   * 
   */
  public async createTenantCompanionRow({
    organization,
    pmEmail,
    tenantEmail,
  }: { organization?: string; pmEmail: string; tenantEmail: string; }) {
    try {
      const result = await this.tenant.update({
        pk: generateKey(ENTITY_KEY.TENANT, tenantEmail.toLowerCase()),
        sk: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.TENANT, pmEmail.toLowerCase()),
        organization,
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }


  /**
   * Updates a tenant's name or status.
   */
  public async update(
    { tenantEmail, tenantName, status }:
      { tenantEmail: string; tenantName?: string; status?: "INVITED" | "JOINED" | "REQUESTED_JOIN"; }) {
    try {
      const result = await this.tenant.update({
        pk: generateKey(ENTITY_KEY.TENANT, tenantEmail.toLowerCase()),
        sk: generateKey(ENTITY_KEY.TENANT, ENTITIES.TENANT),
        ...(tenantName && { tenantName }),
        ...(status && { status }),
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  /**
   * Returns the tenant's user record from the database.
   */
  public async get({ tenantEmail }: { tenantEmail: string; }) {
    try {
      const params = {
        pk: generateKey(ENTITY_KEY.TENANT, tenantEmail.toLowerCase()),
        sk: generateKey(ENTITY_KEY.TENANT, ENTITIES.TENANT)
      };
      const result = await this.tenant.get(params, { consistent: true });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async getAllForPropertyManager({ propertyManagerEmail }: { propertyManagerEmail: string; }) {
    let startKey: StartKey;
    const tenants: ITenant[] = [];
    const GSI1PK = generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.TENANT, propertyManagerEmail.toLowerCase());
    do {
      try {
        const { Items, LastEvaluatedKey } = (await PillarDynamoTable.query(
          GSI1PK,
          {
            limit: 20,
            reverse: true,
            beginsWith: `${ENTITY_KEY.TENANT}#`,
            index: INDEXES.GSI1,
          }
        ));
        startKey = LastEvaluatedKey as StartKey;
        tenants.push(...(Items ?? []) as ITenant[]);
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey);
    return tenants;
  }
}