import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey } from '.';
import { PillarDynamoTable } from '..';
import { generateKey } from '@/utils';

export interface IProperty {
  pmEmail: string;
  pk: string;
  postalCode: string;
  sk: string;
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
};
export class PropertyEntity {
  private propertyEntity: Entity;

  constructor() {
    this.propertyEntity = new Entity({
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
    } as const);
  }

  private generateSk({ address, country = "US", city, state, postalCode, unit }:
    { address: string; country: string; city: string; state: string; postalCode: string; unit?: string; }) {
    return [ENTITY_KEY.PROPERTY, "ADDRESS", address.toUpperCase(), "COUNTRY", country.toUpperCase(), "CITY", city.toUpperCase(), "STATE", state.toUpperCase(), "POSTAL", postalCode.toUpperCase(), "UNIT", unit ? unit?.toUpperCase() : ""].join("#");
  }

  public async create({ address, country = "US", tenantEmail, city, state, postalCode, unit, propertyManagerEmail }: CreatePropertyProps) {
    const result = await this.propertyEntity.update({
      pk: generateKey(ENTITY_KEY.PROPERTY, propertyManagerEmail.toLowerCase()),
      sk: this.generateSk({ address, country, city, state, postalCode, unit }),
      GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER, propertyManagerEmail.toLowerCase()),
      GSI1SK: this.generateSk({ address, country, city, state, postalCode, unit }),
      ...(tenantEmail && { GSI2PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER, tenantEmail.toLowerCase()) }),
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

  private async getAllPropertiesWithPk({ pk }: { pk: string; }) {
    let startKey: StartKey;
    const properties = [];
    do {
      try {
        const { Items, LastEvaluatedKey } = await this.propertyEntity.query(pk, { consistent: true, startKey });
        startKey = LastEvaluatedKey as StartKey;
        properties.push(...(Items ?? []));

      } catch (error) {
        console.log({ error });
      }
    } while (!!startKey);
    return properties;
  }

  public async getAllForPropertyManager({ propertyManagerEmail }: { propertyManagerEmail: string; }) {
    const pk = generateKey(ENTITY_KEY.PROPERTY, propertyManagerEmail.toLowerCase());
    return await this.getAllPropertiesWithPk({ pk });
  }

}
