import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY } from '.';
import { PillarDynamoTable } from '..';
import { generateKey } from '@/utils';

export interface IOrganization {
  pk: string;
  sk: string;
  name: string;
}

type CreateOrgProps = {
  name: string;
  uuid: string;
};

/**
 * ACCESS PATTERNS
 * get all work orders for an organization
 * get all technicians for an organization
 * get all PMs for an organization
 */

export class OrganizationEntity {
  private organizationEntity = new Entity({
    name: ENTITIES.PROPERTY,
    attributes: {
      pk: { partitionKey: true },
      sk: { sortKey: true },
      GSI1PK: { type: 'string' }, // pm
      GSI1SK: { type: 'string' },
      GSI2PK: { type: 'string' },
      GSI2SK: { type: 'string' },
      GSI3PK: { type: 'string' }, // technician
      GSI3SK: { type: 'string' },
      pmEmail: { type: 'string' },
      name: { type: 'string' },
      tenantEmail: { type: 'string' },
      workOrderId: { type: 'string' },
    },
    table: PillarDynamoTable,
  });

  public async create({ name, uuid }: CreateOrgProps) {
    const result = await this.organizationEntity.update(
      {
        pk: uuid,
        sk: uuid,
        name,
      },
      { returnValues: 'ALL_NEW', strictSchemaCheck: true }
    );
    return result.Attributes;
  }

  public async delete({ pk, sk }: { pk: string; sk: string }) {
    const params = {
      pk,
      sk,
    };
    const result = await this.organizationEntity.delete(params);
    return result;
  }
}
