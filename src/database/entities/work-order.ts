import { Entity } from 'dynamodb-toolbox';
import { ENTITIES } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { uuid } from 'uuidv4';


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
};

export class WorkOrderEntity {
  private workOrderEntity: Entity;

  constructor() {
    this.workOrderEntity = new Entity({
      name: ENTITIES.WORK_ORDER,
      attributes: {
        pk: { partitionKey: true },
        sk: { sortKey: true },
        GSI1PK: { type: "string" },
        GSI1SK: { type: "string" },
        GSI2PK: { type: "string" },
        GSI2SK: { type: "string" },
        pmEmail: { type: 'string' },
        issue: { type: "string" },
        tenantEmail: { type: 'string' },
        tenantName: { type: "string" },
        address: { type: "map" },
        status: { type: "string" },
      },
      table: PillarDynamoTable
    } as const);
  }

  private generatePk() {
    return ["WO", uuid()].join('#');
  }

  private generateSk({ status }: { status: WorkOrderStatus; }) {
    return ["STATUS", status].join("#");
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
   * 
   * Generates the PK for the first global secondary index, the property manager email.
   * This will allow us to get all work orders for a given property manager. 
   */
  private generateGSI1PK({ propertyManagerEmail }: { propertyManagerEmail: string; }) {
    return ["PM", propertyManagerEmail.toLowerCase()].join("#");
  }
  private generateGSI2PK({ tenantEmail }: { tenantEmail: string; }) {
    return ["PM", tenantEmail.toLowerCase()].join("#");
  }

  /**
   * Creates a work order entity.
   */
  public async create({ address, country = "US", city, state, postalCode, unit, propertyManagerEmail, status, issue, tenantName, tenantEmail }: CreateWorkOrderProps) {
    const result = await this.workOrderEntity.put({
      pk: this.generatePk(),
      sk: this.generateSk({ status }),
      GSI1PK: this.generateGSI1PK({ propertyManagerEmail }),
      GSI1SK: this.generateSk({ status }),
      GSI2PK: this.generateGSI2PK({ tenantEmail }),
      GSI2SK: this.generateSk({ status }),
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
  public async get({ addressId, status }:
    { addressId: string; status: WorkOrderStatus; }) {
    const params = {
      pk: this.generatePk(), // can query all properties for a given property manager
      sk: this.generateSk({ status })
    };
    const result = await this.workOrderEntity.get(params, { consistent: true });
    return result;
  }

  /**
   * @returns All work orders for a given property manager
   */
  public async getAllForPropertyManager({ propertyManagerEmail }: { propertyManagerEmail: string; }) {
    const GSI1PK = this.generateGSI1PK({ propertyManagerEmail });
    try {
      const result = (await PillarDynamoTable.query(
        GSI1PK,
        {
          limit: 20,
          reverse: true,
          beginsWith: "STATUS",
          index: INDEXES.GSI1,
        }
      ));
      return result.Items ?? [];
    } catch (err) {
      console.log({ err });
    }
  }
}

