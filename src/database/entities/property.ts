import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey, createAddressString, generateAddressSk } from '.';
import { INDEXES, MAX_RETRIES, PillarDynamoTable } from '..';
import { generateKey } from '@/utils';
import { API_STATUS, PAGE_SIZE } from '@/constants';
import { ApiError } from '@/pages/api/_types';

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
  addressString: string;
  tenantEmail?: string;
  tenantEmails: string[];
  unit: string;
  numBeds: number;
  numBaths: number;
  GSI1PK: string;
}

type CreatePropertyProps = {
  address: string;
  city: string;
  country: string;
  postalCode: string;
  state: string;
  organization: string;
  propertyManagerEmail: string;
  tenantEmails?: string[];
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
      addressString: { type: 'string' },
      organization: { type: 'string' },
      tenantEmail: { type: 'string' },
      tenantEmails: { type: 'list' },
      unit: { type: 'string' },
      city: { type: 'string' },
      state: { type: 'string' },
      postalCode: { type: 'string' },
      numBeds: { type: 'number' },
      numBaths: { type: 'number' },
      version: { type: 'number' },
    },
    table: PillarDynamoTable,
  } as const);

  public async create({
    address,
    country = 'US',
    tenantEmails,
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
    const addressSk = generateAddressSk({
      entityKey: ENTITY_KEY.PROPERTY,
      address,
      country,
      city,
      state,
      postalCode,
      unit,
    });
    const addressString = createAddressString({
      address,
      city,
      state,
      postalCode,
      unit,
    });

    const result = await this.propertyEntity.update(
      {
        pk: propertyId,
        sk: addressSk,
        GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.PROPERTY, propertyManagerEmail),
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
        addressString,
        version: 1,
      },
      { returnValues: 'ALL_NEW', strictSchemaCheck: true }
    );
    return result.Attributes;
  }

  /* Get by property id */
  public async getById({ uuid }: { uuid: string }) {
    const { Items, LastEvaluatedKey } = await this.propertyEntity.query(generateKey(ENTITY_KEY.PROPERTY, uuid), {
      reverse: true,
      beginsWith: `${ENTITY_KEY.PROPERTY}#`,
    });
    return Items?.length ? Items[0] : null;
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
      numBeds: number;
      numBaths: number;
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
        eq: generateAddressSk({ entityKey: ENTITY_KEY.PROPERTY, ...address }),
        filters: [
          { attr: 'numBeds', eq: address.numBeds },
          { attr: 'numBaths', eq: address.numBaths },
        ],
      });
      startKey = LastEvaluatedKey as StartKey;
      Items?.length && properties.push(...Items);
    } while (!!startKey && properties.length === 0);
    return properties;
  }

  /* Get by property id */
  public async getByOrganization({ organization, startKey, searchString }: { organization: string; startKey: StartKey; searchString?: string }) {
    let properties: any[] = [];
    const GSI4PK = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.PROPERTY, organization);

    let remainingPropertiesToFetch = PAGE_SIZE;
    do {
      const { Items, LastEvaluatedKey } = await this.propertyEntity.query(GSI4PK, {
        ...(startKey && { startKey }),
        limit: remainingPropertiesToFetch,
        reverse: false,
        ...(searchString && { filters: [{ attr: 'addressString', contains: searchString }] }),
        beginsWith: `${ENTITY_KEY.PROPERTY}#`,
        index: INDEXES.GSI4,
      });
      startKey = LastEvaluatedKey as StartKey;
      remainingPropertiesToFetch -= Items?.length ?? 0;
      Items?.length && properties.push(...Items);
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
  public async getAllForPropertyManager({ pmEmail, startKey }: { pmEmail: string; startKey: StartKey }) {
    const GSI1PK = generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.PROPERTY, pmEmail?.toLowerCase());
    let properties = [];
    let remainingPropertiesToFetch = PAGE_SIZE;
    do {
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
    } while (!!startKey && remainingPropertiesToFetch > 0);
    return { properties, startKey };
  }

  // Version safe updating for an existing address
  public async editAddress({
    propertyUUId,
    address,
    city,
    state,
    unit,
    postalCode,
    country,
    numBeds,
    numBaths,
    organization, 
    pmEmail,
  }: {
    propertyUUId: string;
    address: string;
    city: string;
    state: string;
    unit?: string;
    postalCode: string;
    country: string;
    numBeds: number;
    numBaths: number;
    organization: string;
    pmEmail: string;
  }) {
      const oldProperty = await this.getById({ uuid: propertyUUId });
      if (!oldProperty) {
        throw new ApiError(API_STATUS.BAD_REQUEST, 'Property does not exist', true);
      }

      await this.delete({ pk: oldProperty.pk, sk: oldProperty.sk });

      //Create the new address
      const newProperty = await this.create({
        address,
        city,
        state,
        unit,
        postalCode,
        country,
        organization,
        propertyManagerEmail: pmEmail,
        uuid: propertyUUId,
        tenantEmails: oldProperty.tenantEmails,
        numBeds,
        numBaths,
      });

      return newProperty;
  }

  // Adds/Removes a tenant email to the list of tenant emails associated with a property
  public async addRemoveTenant({ propertyUUId, tenantEmail, remove }: { propertyUUId: string; tenantEmail: string; remove: boolean }) {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      const oldProperty = await this.getById({ uuid: propertyUUId });
      if (!oldProperty) {
        throw new ApiError(API_STATUS.BAD_REQUEST, 'Property does not exist', true);
      }

      let newTenantEmails: string[] = oldProperty?.tenantEmails ?? [];

      if (remove) {
        if (!newTenantEmails.includes(tenantEmail)) {
          throw new ApiError(API_STATUS.BAD_REQUEST, 'Tenant not in property', true);
        }
        newTenantEmails = newTenantEmails.filter((email) => email !== tenantEmail);
      } else {
        if (newTenantEmails.includes(tenantEmail)) {
          throw new ApiError(API_STATUS.BAD_REQUEST, 'Tenant already added to property', true);
        }

        newTenantEmails.push(tenantEmail);
      }

      //Add the map with the new address back into the tenant record
      const { property, err } = await this.updateProperty({
        pk: oldProperty.pk,
        sk: oldProperty.sk,
        tenantEmails: newTenantEmails,
        version: oldProperty.version ?? 1,
      });

      if (err) {
        attempt++;
        continue;
      }
      return property;
    }
    throw new ApiError(API_STATUS.INTERNAL_SERVER_ERROR, 'Failed to add/remove tenant after maximum retries');
  }

  // Updates fields of the property with versioning enforced
  public async updateProperty({
    pk,
    sk,
    version,
    tenantEmails,
  }: {
    pk: string;
    sk: string;
    version: number;
    tenantEmails?: string[];
  }): Promise<{ property: any; err: any }> {
    try {
      const updatedProperty = await this.propertyEntity.update(
        {
          pk,
          sk,
          ...(tenantEmails && { tenantEmails }),
          version: version + 1,
        },
        {
          conditions: [
            { attr: 'version', eq: version },
            { or: true, attr: 'version', exists: false },
          ],
          returnValues: 'ALL_NEW',
          strictSchemaCheck: true,
        }
      );
      return Promise.resolve({ property: updatedProperty.Attributes ?? null, err: null });
    } catch (err) {
      return Promise.resolve({ property: null, err });
    }
  }
}
