import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { generateKey } from '@/utils';

export type WorkOrderStatus = "COMPLETE" | "TO_DO";
type CreateWorkOrderProps = {
  uuid: string;
  address: string;
  tenantEmail: string;
  tenantName: string;
  unit?: string;
  createdBy: string;
  createdByType: "TENANT" | "PROPERTY_MANAGER",
  state: string;
  permissionToEnter: "yes" | "no";
  city: string;
  country: string;
  postalCode: string;
  propertyManagerEmail: string;
  status: WorkOrderStatus;
  issue: string;
};

type PropertyAddress = {
  address: string;
  unit?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export interface IWorkOrder {
  pk: string,
  sk: string,
  created: string,
  GSI1PK: string,
  GSI1SK: string,
  GSI2PK: string,
  GSI2SK: string,
  pmEmail: string,
  issue: string,
  permissionToEnter: "yes" | "no",
  tenantEmail: string,
  createdBy: string,
  createdByType: "TENANT" | "PROPERTY_MANAGER",
  tenantName: string,
  address: PropertyAddress,
  status: WorkOrderStatus;
  assignedTo: Set<string>;
};

export class WorkOrderEntity {
  private workOrderEntity: Entity;

  constructor() {
    this.workOrderEntity = new Entity({
      name: ENTITIES.WORK_ORDER,
      attributes: {
        pk: { partitionKey: true },
        sk: { sortKey: true },
        GSI1PK: { type: "string" }, //PM email
        GSI1SK: { type: "string" },
        GSI2PK: { type: "string" }, //Tenant email
        GSI2SK: { type: "string" },
        permissionToEnter: { type: "string" },
        pmEmail: { type: 'string' },
        issue: { type: "string" },
        tenantEmail: { type: 'string' },
        tenantName: { type: "string" },
        address: { type: "map" },
        status: { type: "string" },
        createdBy: { type: "string" },
        createdByType: { type: "string" },
        assignedTo: { type: "set" },
      },
      table: PillarDynamoTable
    } as const);
  }

  private generateAddress({
    address,
    country,
    city,
    state,
    postalCode,
    unit,
  }: {
    address: string;
    country: string;
    city: string;
    state: string;
    postalCode: string;
    unit?: string;
  }) {
    return {
      address, unit, city, state, postalCode, country
    };
  }

  /**
   * Creates a work order entity.
   */
  public async create({
    uuid,
    address,
    country = "US",
    city,
    createdBy,
    createdByType,
    state,
    postalCode,
    permissionToEnter,
    unit,
    propertyManagerEmail,
    status,
    issue,
    tenantName,
    tenantEmail
  }: CreateWorkOrderProps) {
    const workOrderIdKey = generateKey(ENTITY_KEY.WORK_ORDER, uuid);
    const result = await this.workOrderEntity.put({
      pk: workOrderIdKey,
      sk: workOrderIdKey,
      GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER, propertyManagerEmail.toLowerCase()),
      GSI1SK: workOrderIdKey,
      GSI2PK: generateKey(ENTITY_KEY.TENANT, tenantEmail.toLowerCase()),
      GSI2SK: workOrderIdKey,
      permissionToEnter,
      pmEmail: propertyManagerEmail.toLowerCase(),
      createdBy: createdBy.toLowerCase(),
      createdByType,
      tenantEmail,
      status,
      tenantName,
      address: this.generateAddress({ address, country, city, state, postalCode, unit }),
      issue: issue.toLowerCase(),
    });
    return result.Item;
  }

  /**
   * @returns Work Order metadata for a single work order.
   */
  public async get({ pk, sk }:
    { pk: string; sk: string; }) {
    const params = {
      pk,
      sk,
    };
    const result = await this.workOrderEntity.get(params, { consistent: true });
    return result;
  }

  /**
   * @returns All work orders for a given property manager
   */
  public async getAllForPropertyManager({ propertyManagerEmail }: { propertyManagerEmail: string; }) {
    const GSI1PK = generateKey(ENTITY_KEY.PROPERTY_MANAGER, propertyManagerEmail.toLowerCase());
    try {
      const result = (await PillarDynamoTable.query(
        GSI1PK,
        {
          limit: 20,
          reverse: true,
          beginsWith: `${ENTITY_KEY.WORK_ORDER}#`,
          index: INDEXES.GSI1,
        }
      ));
      return result.Items ?? [];
    } catch (err) {
      console.log({ err });
    }
  }

  public async update({ pk, sk, status, permissionToEnter }: { pk: string, sk: string; status: WorkOrderStatus; permissionToEnter: "yes" | "no"; }) {
    try {
      const result = await this.workOrderEntity.update({
        pk,
        sk,
        status,
        permissionToEnter
      }, { returnValues: "ALL_NEW", strictSchemaCheck: true });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async assignToTechnician({ woId, technicianEmail }: { woId: string; technicianEmail: string; }) {
    const key = generateKey(ENTITY_KEY.WORK_ORDER, woId);
    try {
      const result = await this.workOrderEntity.update({
        pk: key,
        sk: key,
        assignedTo: {
          $add: [technicianEmail.toLowerCase()]
        }
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

}
