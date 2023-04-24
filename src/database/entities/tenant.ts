import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { generateKey } from '@/utils';


export type CreateTenantProps = {
  tenantEmail: string;
  tenantName: string;
  pmEmail: string;
  address: string;
  country: string;
  city: string;
  state: string;
  postalCode: string;
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
      unit
    }: CreateTenantProps) {
    try {
      const result = await this.tenant.update({
        pk: generateKey(ENTITY_KEY.TENANT, tenantEmail.toLowerCase()),
        sk: generateKey(ENTITY_KEY.TENANT, ENTITIES.TENANT),
        GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER, pmEmail.toLowerCase()),
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
          isPrimary: true
        }),
      }, { returnValues: "ALL_NEW", strictSchemaCheck: true });
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
    const GSI1PK = generateKey(ENTITY_KEY.PROPERTY_MANAGER, propertyManagerEmail.toLowerCase());
    try {
      const result = (await PillarDynamoTable.query(
        GSI1PK,
        {
          limit: 20,
          reverse: true,
          beginsWith: `${ENTITY_KEY.TENANT}#`,
          index: INDEXES.GSI1,
        }
      ));
      return result.Items ?? [];
    } catch (err) {
      console.log({ err });
    }
  }

}
