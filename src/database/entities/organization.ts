import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { generateKey, toTitleCase } from '@/utils';

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
      GSI1PK: { type: "string" }, // pm
      GSI1SK: { type: "string" }, GSI2PK: { type: "string" },
      GSI2SK: { type: "string" },
      GSI3PK: { type: "string" }, // technician
      GSI3SK: { type: "string" },
      pmEmail: { type: "string" },
      name: { type: "string" },
      tenantEmail: { type: "string" },
      workOrderId: { type: "string" },
    },
    table: PillarDynamoTable
  });


  public async create({ name, uuid }: CreateOrgProps) {
    const orgId = generateKey(ENTITY_KEY.ORGANIZATION, uuid);
    const result = await this.organizationEntity.update({
      pk: orgId,
      sk: orgId,
      name
    }, { returnValues: "ALL_NEW", strictSchemaCheck: true });
    return result.Attributes;
  }
}