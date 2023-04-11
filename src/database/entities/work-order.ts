import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, StartKey } from '.';
import { INDEXES, PillarDynamoTable } from '..';

type WorkOrderStatus = "TO_DO" | "COMPLETE";
type CreateWorkOrderProps = { addressId: string, propertyManagerEmail: string; status: WorkOrderStatus; issue: string; };

export class WorkOrderEntity {
  private propertyEntity: Entity;

  constructor() {
    this.propertyEntity = new Entity({
      name: ENTITIES.WORK_ORDER,
      attributes: {
        pk: { partitionKey: true },
        sk: { sortKey: true },
        GSI1PK: { type: "string" },
        GSI1SK: { type: "string" },
        pmEmail: { type: 'string' },
        issue: { type: "string" },
        tenantEmail: { type: 'string' },
        addressId: { type: "string" },
        status: { type: "string" },
      },
      table: PillarDynamoTable
    } as const);
  }

  private generatePk({ addressId }: { addressId: string; }) {
    return ["WO", addressId.toLowerCase()].join('#');
  }

  private generateSk({ status }: { status: WorkOrderStatus; }) {
    return ["STATUS", status].join("#");
  }

  /**
   * 
   * Generates the PK for the first global secondary index, the property manager email.
   * This will allow us to get all work orders for a given property manager. 
   */
  private generateGSI1PK({ propertyManagerEmail }: { propertyManagerEmail: string; }) {
    return ["PM", propertyManagerEmail.toLowerCase()].join("#");
  }

  /**
   * Creates a work order entity.
   */
  public async create({ addressId, propertyManagerEmail, status, issue }: CreateWorkOrderProps) {
    const result = await this.propertyEntity.put({
      pk: this.generatePk({ addressId }),
      sk: this.generateSk({ status }),
      GSI1PK: this.generateGSI1PK({ propertyManagerEmail }),
      GSI1SK: this.generateSk({ status }),
      pmEmail: propertyManagerEmail.toLowerCase(),
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
      pk: this.generatePk({ addressId }), // can query all properties for a given property manager
      sk: this.generateSk({ status })
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

  /**
   * 
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
