import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { uuid } from 'uuidv4';
import { generateKey } from '@/utils';

export type WorkOrderStatus = "COMPLETE" | "TO_DO";
type CreateWorkOrderProps = {
  address: string;
  tenantEmail: string;
  tenantName: string;
  unit?: string;
  state: string;
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
  tenantEmail: string,
  tenantName: string,
  address: PropertyAddress,
  status: WorkOrderStatus;
  assignedTo: Map<string, string>;
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
        pmEmail: { type: 'string' },
        issue: { type: "string" },
        tenantEmail: { type: 'string' },
        tenantName: { type: "string" },
        address: { type: "map" },
        status: { type: "string" },
        assignedTo: { type: "map" },
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
  public async create({ address, country = "US", city, state, postalCode, unit, propertyManagerEmail, status, issue, tenantName, tenantEmail}: CreateWorkOrderProps) {
    const uniqueId = uuid();
    const workOrderIdKey = generateKey(ENTITY_KEY.WORK_ORDER, uniqueId)
    const result = await this.workOrderEntity.put({
      pk: workOrderIdKey,
      sk: workOrderIdKey,
      GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER, propertyManagerEmail.toLowerCase()),
      GSI1SK: workOrderIdKey,
      GSI2PK: generateKey(ENTITY_KEY.TENANT, tenantEmail.toLowerCase()),
      GSI2SK: workOrderIdKey,
      pmEmail: propertyManagerEmail.toLowerCase(),
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
          beginsWith: "WO",
          index: INDEXES.GSI1,
        }
      ));
      return result.Items ?? [];
    } catch (err) {
      console.log({ err });
    }
  }

  public async update({ pk, sk, status}: { pk: string, sk: string; status: WorkOrderStatus; }) {
    try {
      const result = await this.workOrderEntity.update({
        pk,
        sk,
        status
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
            $set: {
                [technicianEmail.toLowerCase()]: technicianEmail.toLowerCase()
            }
        }
      }, { returnValues: "ALL_NEW" });
      return result;
    } catch (err) {
      console.log({ err });
    }
  }
  
}
