import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey, generateAddressSk } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { generateKey } from '@/utils';
import { PAGE_SIZE } from '@/constants';

export interface IProperty {
  pk: string;
  sk: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
  organization: string;
  created: string;
  address: string;
  tenantEmails: string[];
  unit: string;
  numBeds: number;
  numBaths: number;
}

type CreatePropertyProps = {
  address: string;
  city: string;
  country: string;
  postalCode: string;
  state: string;
  organization: string;
  propertyManagerEmail: string;
  tenantEmail?: string;
  unit?: string;
  uuid: string;
  numBeds: number;
  numBaths: number;
};
export class PropertyEntity {
  private propertyEntity = new Entity({
    name: ENTITIES.PROPERTY,
    attributes: {
      pk: { partitionKey: true },
      sk: { sortKey: true },
      GSI1PK: { type: 'string' }, //Search by organization
      GSI1SK: { type: 'string' },
      GSI2PK: { type: 'string' },
      GSI2SK: { type: 'string' },
      GSI4PK: { type: 'string' },
      GSI4SK: { type: 'string' },
      country: { type: 'string' },
      address: { type: 'string' },
      organization: { type: 'string' },
      tenantEmails: { type: 'list' },
      unit: { type: 'string' },
      city: { type: 'string' },
      state: { type: 'string' },
      postalCode: { type: 'string' },
      workOrders: { type: 'list' },
      numBeds: { type: 'number' },
      numBaths: { type: 'number' },
    },
    table: PillarDynamoTable,
  } as const);

  public async create({
    address,
    country = 'US',
    tenantEmail,
    city,
    state,
    postalCode,
    unit,
    organization,
    propertyManagerEmail,
    uuid,
    numBeds,
    numBaths,
  }: CreatePropertyProps) {
    const propertyId = generateKey(ENTITY_KEY.PROPERTY, uuid);
    const tenantEmails = tenantEmail ? [tenantEmail] : [];
    const addressSk = generateAddressSk({ address, country, city, state, postalCode, unit });

    const result = await this.propertyEntity.update(
      {
        pk: propertyId,
        sk: addressSk,
        GSI1PK: generateKey(
          ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.PROPERTY,
          propertyManagerEmail
        ),
        GSI1SK: addressSk,
        GSI4PK: generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.PROPERTY, organization),
        GSI4SK: addressSk,
        tenantEmails,
        country,
        address,
        city,
        state,
        postalCode,
        organization,
        unit: unit ?? '',
        numBeds,
        numBaths,
      },
      { returnValues: 'ALL_NEW', strictSchemaCheck: true }
    );
    return result.Attributes;
  }

  /* Get by property id */
  public async getById({
    uuid,
    address,
    country,
    city,
    state,
    postalCode,
    unit,
  }: {
    uuid: string;
    address: string;
    country: string;
    city: string;
    state: string;
    postalCode: string;
    unit?: string;
  }) {
    const params = {
      pk: generateKey(ENTITY_KEY.PROPERTY, uuid),
      sk: generateAddressSk({ address, country, city, state, postalCode, unit }),
    };
    const result = await this.propertyEntity.get(params, { consistent: false });
    return result;
  }

  /* Attempts to find any properties with the same address, searches within the users organization */
  public async getPropertiesByAddress({
    organization,
    address,
  }: {
    organization: string;
    address: {
      address: string;
      country: string;
      city: string;
      state: string;
      postalCode: string;
      unit?: string;
    };
  }) {
    let properties: any[] = [];
    let startKey: StartKey = undefined;
    const GSI4PK = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.PROPERTY, organization);

    do {
      const { Items, LastEvaluatedKey } = await this.propertyEntity.query(GSI4PK, {
        ...(startKey && { startKey }),
        reverse: true,
        index: INDEXES.GSI4,
        eq: generateAddressSk(address),
      });
      startKey = LastEvaluatedKey as StartKey;
      Items?.length && properties.push(...Items);
    } while (!!startKey && properties.length === 0);
    return properties;
  }

  /* Get by property id */
  public async getByOrganization({
    organization,
    startKey,
  }: {
    organization: string;
    startKey: StartKey;
  }) {
    let properties: any[] = [];
    const GSI4PK = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.PROPERTY, organization);

    let remainingPropertiesToFetch = PAGE_SIZE;
    do {
      try {
        const { Items, LastEvaluatedKey } = await this.propertyEntity.query(GSI4PK, {
          ...(startKey && { startKey }),
          limit: remainingPropertiesToFetch,
          reverse: true,
          beginsWith: `${ENTITY_KEY.PROPERTY}#`,
          index: INDEXES.GSI4,
        });
        startKey = LastEvaluatedKey as StartKey;
        remainingPropertiesToFetch -= Items?.length ?? 0;
        Items?.length && properties.push(...Items);
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey && remainingPropertiesToFetch > 0);
    return { properties, startKey };
  }

  public async delete({ pk, sk }: { pk: string; sk: string }) {
    const params = {
      pk,
      sk,
    };
    const result = await this.propertyEntity.delete(params);
    return result;
  }

  /**
   * @returns all properties that a given property manager is assigned to.
   */
  public async getAllForPropertyManager({
    pmEmail,
    startKey,
  }: {
    pmEmail: string;
    startKey: StartKey;
  }) {
    const GSI1PK = generateKey(
      ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.PROPERTY,
      pmEmail?.toLowerCase()
    );
    let properties = [];
    let remainingPropertiesToFetch = PAGE_SIZE;
    do {
      try {
        const { Items, LastEvaluatedKey } = await this.propertyEntity.query(GSI1PK, {
          ...(startKey && { startKey }),
          limit: remainingPropertiesToFetch,
          reverse: true,
          beginsWith: `${ENTITY_KEY.PROPERTY}#`,
          index: INDEXES.GSI1,
        });
        startKey = LastEvaluatedKey as StartKey;
        remainingPropertiesToFetch -= Items?.length ?? 0;
        Items?.length && properties.push(...Items);
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey && remainingPropertiesToFetch > 0);
    return { properties, startKey };
  }

  // Updates the tenantEmails field using pk and sk
  public async updateTenantEmails({
    pk,
    sk,
    newTenantEmails,
  }: {
    pk: string;
    sk: string;
    newTenantEmails: string[];
  }) {
    const result = await this.propertyEntity.update(
      {
        pk,
        sk,
        tenantEmails: newTenantEmails,
      },
      { returnValues: 'ALL_NEW', strictSchemaCheck: true }
    );
    return result.Attributes;
  }
}
