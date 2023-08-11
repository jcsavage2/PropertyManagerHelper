import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { generateKey } from '@/utils';

export interface IProperty {
  pk: string;
  sk: string;
  pmEmail: string;
  postalCode: string;
  city: string;
  state: string;
  organizationId: string;
  created: string;
  address: string;
  tenants: Map<string, string>; // tenant email, tenant name
  unit: string;

}

type CreatePropertyProps = {
  address: string;
  city: string;
  country: string;
  postalCode: string;
  propertyManagerEmail: string;
  state: string;
  tenantEmail?: string;
  unit?: string;
  uuid: string;
};
export class PropertyEntity {
  private propertyEntity = new Entity({
    name: ENTITIES.PROPERTY,
    attributes: {
      pk: { partitionKey: true },
      sk: { sortKey: true },
      GSI1PK: { type: "string" },
      GSI1SK: { type: "string" },
      GSI2PK: { type: "string" },
      GSI2SK: { type: "string" },
      country: { type: 'string' },
      address: { type: 'string' },
      pmEmail: { type: "string" },
      tenantEmail: { type: "string" },
      tenants: { type: "map" },
      unit: { type: 'string' },
      city: { type: 'string', },
      state: { type: 'string' },
      postalCode: { type: 'string' },
      workOrders: { type: 'list' },
    },
    table: PillarDynamoTable
  });

  private generateSk({ address, country = "US", city, state, postalCode, unit }:
    { address: string; country: string; city: string; state: string; postalCode: string; unit?: string; }) {
    return [ENTITY_KEY.PROPERTY, "ADDRESS", address.toUpperCase(), "COUNTRY", country.toUpperCase(), "CITY", city.toUpperCase(), "STATE", state.toUpperCase(), "POSTAL", postalCode.toUpperCase(), "UNIT", unit ? unit?.toUpperCase() : ""].join("#");
  }

  public async create({ address, country = "US", tenantEmail, city, state, postalCode, unit, propertyManagerEmail, uuid }: CreatePropertyProps) {
    const propertyId = generateKey(ENTITY_KEY.PROPERTY, uuid);
    const result = await this.propertyEntity.update({
      pk: propertyId,
      sk: this.generateSk({ address, country, city, state, postalCode, unit }),
      GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.PROPERTY, propertyManagerEmail.toLowerCase()),
      GSI1SK: this.generateSk({ address, country, city, state, postalCode, unit }),
      ...(tenantEmail && { GSI2PK: generateKey(ENTITY_KEY.TENANT + ENTITY_KEY.PROPERTY, tenantEmail.toLowerCase()) }),
      ...(tenantEmail && { GSI2SK: this.generateSk({ address, country, city, state, postalCode, unit }) }),
      tenantEmail: tenantEmail?.toLowerCase(),
      country: country.toUpperCase(),
      address: address.toUpperCase(),
      city: city.toUpperCase(),
      state: state.toUpperCase(),
      postalCode: postalCode.toUpperCase(),
      pmEmail: propertyManagerEmail.toLowerCase(),
      unit: unit?.toUpperCase() ?? "",
    }, { returnValues: "ALL_NEW", strictSchemaCheck: true });

    //@ts-ignore
    return result.Attributes;
  }

  public async get({ address, country, city, state, postalCode, unit, propertyManagerEmail }:
    {
      address: string;
      country: string;
      city: string;
      state: string;
      postalCode: string;
      unit?: string;
      propertyManagerEmail: string;
    }) {
    const params = {
      pk: generateKey(ENTITY_KEY.PROPERTY, propertyManagerEmail.toLowerCase()), // can query all properties for a given property manager
      sk: this.generateSk({ address, country, city, state, postalCode, unit })
    };
    const result = await this.propertyEntity.get(params, { consistent: true });
    return result;
  }

  /**
   * @returns all properties that a given property manager is assigned to.
   */
  public async getAllForPropertyManager({ pmEmail }: { pmEmail: string; }) {
    const GSI1PK = generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.PROPERTY, pmEmail?.toLowerCase());
    let startKey: StartKey;
    const properties = [];
    do {
      console.log("counting...");
      try {
        const { Items, LastEvaluatedKey } = await this.propertyEntity.query(
          GSI1PK,
          {
            startKey,
            limit: 20,
            reverse: true,
            beginsWith: `${ENTITY_KEY.PROPERTY}#`,
            index: INDEXES.GSI1,
          }
        );
        startKey = LastEvaluatedKey as StartKey;
        Items?.length && properties.push(...Items);
        console.log({ Items: Items?.length });
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey);
    return properties;
  }

  // It may make more sense to store properties on the tenant record, and then update the tenant + property row when tenants move away. 
  // We could also save "historical properties" and "historical tenants" on the user and property entities, respectively. 
  public async getAllForTenant({ tenantEmail }: { tenantEmail: string; }) {
    let startKey: StartKey;
    const properties: IProperty[] = [];
    const GSI2PK = generateKey(ENTITY_KEY.TENANT + ENTITY_KEY.PROPERTY, tenantEmail?.toLowerCase());
    do {
      try {
        const { Items, LastEvaluatedKey } = (await PillarDynamoTable.query(
          GSI2PK,
          {
            limit: 20,
            startKey,
            reverse: true,
            beginsWith: `${ENTITY_KEY.PROPERTY}#`,
            index: INDEXES.GSI2,
          }
        ));
        startKey = LastEvaluatedKey as StartKey;
        properties.push(...(Items ?? []) as IProperty[]);
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey);
    return properties;
  }

  /**
   * 
   * @param tenantEmails an array of tenant emails.
   * Updates the property entitiy by moving the tenants map to the historical tenants map.
   */
  public async removeTenantsFromProperty({ pk, address, country, city, state, postalCode, unit }: { pk: string, address: string, country: string, city: string, state: string, postalCode: string, unit: string; }) {
    const result = await this.propertyEntity.update({
      pk: pk,
      sk: this.generateSk({ address, country, city, state, postalCode, unit }),
    }, { returnValues: "ALL_NEW", strictSchemaCheck: true });

    //@ts-ignore
    return result.Attributes;
  }

}
