import { Entity } from "dynamodb-toolbox";
import { ENTITIES, ENTITY_KEY, StartKey } from ".";
import { INDEXES, PillarDynamoTable } from "..";
import { generateKey } from "@/utils";
import { UserType } from "./user";

export interface IGetAllWorkOrdersForUserProps { email: string; userType: UserType; orgId?: string; };

export type WorkOrderStatus = "COMPLETE" | "TO_DO";
type CreateWorkOrderProps = {
  uuid: string;
  address: string;
  tenantEmail: string;
  tenantName: string;
  unit?: string;
  createdBy: string;
  createdByType: UserType;
  state: string;
  permissionToEnter: "yes" | "no";
  organization?: string;
  city: string;
  country: string;
  postalCode: string;
  propertyManagerEmail: string;
  status: WorkOrderStatus;
  issue: string;
  location: string;
  additionalDetails: string;
};

export type PropertyAddress = {
  address: string;
  unit?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type AssignTechnicianProps = {
  technicianEmail: string;
  workOrderId: string;
  address: PropertyAddress;
  status: IWorkOrder["status"];
  issueDescription: string;
  permissionToEnter: "yes" | "no";
  pmEmail: string;
};

export interface IWorkOrder {
  pk: string;
  sk: string;
  created: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  /** Technician Email */
  GSI3PK: string;
  /** Work Order ID */
  GSI3SK: string;
  pmEmail: string;
  issue: string;
  location: string;
  additionalDetails: string;
  permissionToEnter: "yes" | "no";
  tenantEmail: string;
  createdBy: string;
  createdByType: "TENANT" | "PROPERTY_MANAGER" | "TECHNICIAN";
  tenantName: string;
  address: PropertyAddress;
  status: WorkOrderStatus;
  assignedTo: Set<string>;
};

export class WorkOrderEntity {
  private workOrderEntity = new Entity({
    name: ENTITIES.WORK_ORDER,
    attributes: {
      pk: { partitionKey: true },
      sk: { sortKey: true },
      GSI1PK: { type: "string" }, //PM email
      GSI1SK: { type: "string" },
      GSI2PK: { type: "string" }, //Tenant email
      GSI2SK: { type: "string" },
      GSI3PK: { type: "string" }, //Technician email
      GSI3SK: { type: "string" },
      GSI4PK: { type: "string" }, //Org Id 
      GSI4SK: { type: "string" },
      permissionToEnter: { type: "string" },
      pmEmail: { type: "string" },
      organization: { type: "string" },
      issue: { type: "string" },
      location: { type: "string" },
      additionalDetails: { type: "string" },
      tenantEmail: { type: "string" },
      tenantName: { type: "string" },
      address: { type: "map" },
      status: { type: "string" },
      createdBy: { type: "string" },
      createdByType: { type: "string" },
      assignedTo: { type: "set" },
    },
    table: PillarDynamoTable,
  } as const);

  /**
   * Create a work order entity.
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
    organization,
    location,
    additionalDetails,
    tenantName,
    tenantEmail
  }: CreateWorkOrderProps) {
    const workOrderIdKey = generateKey(ENTITY_KEY.WORK_ORDER, uuid);
    const result = await this.workOrderEntity.update({
      pk: workOrderIdKey,
      sk: workOrderIdKey,
      GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.WORK_ORDER, propertyManagerEmail.toLowerCase()),
      GSI1SK: workOrderIdKey,
      GSI2PK: generateKey(ENTITY_KEY.TENANT + ENTITY_KEY.WORK_ORDER, tenantEmail.toLowerCase()),
      GSI2SK: workOrderIdKey,
      ...(organization && { GSI4PK: generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.WORK_ORDER, organization) }),
      ...(organization && { GSI4SK: workOrderIdKey }),
      permissionToEnter,
      pmEmail: propertyManagerEmail.toLowerCase(),
      createdBy: createdBy.toLowerCase(),
      createdByType,
      tenantEmail,
      status,
      tenantName,
      address: this.generateAddress({ address, country, city, state, postalCode, unit }),
      issue: issue.toLowerCase(),
      organization,
      location,
      additionalDetails,
    }, { returnValues: "ALL_NEW" });
    return result.Attributes;
  }

  public async get({ pk, sk }:
    { pk: string; sk: string; }) {
    const params = {
      pk,
      sk,
    };
    const result = await this.workOrderEntity.get(params, { consistent: false });
    return result;
  }

  /**
 * @returns All work orders for a given property manager
 */
  public async getAllForOrg({ orgId }: { orgId: string; }) {
    let startKey: StartKey;
    const workOrders: IWorkOrder[] = [];
    const GSI4PK = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.WORK_ORDER, orgId);
    do {
      try {
        const { Items, LastEvaluatedKey } = (await PillarDynamoTable.query(
          GSI4PK,
          {
            limit: 20,
            reverse: true,
            beginsWith: `${ENTITY_KEY.WORK_ORDER}#`,
            index: INDEXES.GSI4,
          }
        ));
        startKey = LastEvaluatedKey as StartKey;
        workOrders.push(...(Items ?? []) as IWorkOrder[]);
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey);
    return workOrders;
  }



  /**
   * 
   * @returns work orders for a given user, based on userType. If org is passed, fetch all for the organization.
   */
  public async getAllForUser({ email, userType, orgId }: IGetAllWorkOrdersForUserProps) {
    let startKey: StartKey;
    const workOrders: IWorkOrder[] = [];

    let pk: string = "";
    let index: undefined | string;

    if (orgId) {
      pk = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.WORK_ORDER, orgId);
      index = INDEXES.GSI4;
    } else {
      switch (userType) {
        case "PROPERTY_MANAGER":
          pk = generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.WORK_ORDER, email?.toLowerCase());
          index = INDEXES.GSI1;
          break;
        case "TECHNICIAN":
          pk = generateKey(ENTITY_KEY.TECHNICIAN + ENTITY_KEY.WORK_ORDER, email.toLowerCase());
          index = INDEXES.GSI3;
          break;
        case "TENANT":
          pk = generateKey(ENTITY_KEY.TENANT + ENTITY_KEY.WORK_ORDER, email?.toLowerCase());
          index = INDEXES.GSI2;
          break;
        default:
          throw new Error("No user type or organization sent when querying work orders");
      }
    }

    do {
      try {
        const { Items, LastEvaluatedKey } = (await PillarDynamoTable.query(
          pk,
          {
            limit: 20,
            reverse: true,
            beginsWith: `${ENTITY_KEY.WORK_ORDER}#`,
            ...(index && { index }),
          }
        ));
        startKey = LastEvaluatedKey as StartKey;
        workOrders.push(...(Items ?? []) as IWorkOrder[]);
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey);
    return workOrders;
  }

  public async getAllForPropertyManager({ pmEmail }: { pmEmail: string; }) {
    let startKey: StartKey;
    const workOrders = [];
    const GSI1PK = generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.WORK_ORDER, pmEmail?.toLowerCase());
    do {
      try {
        const { Items, LastEvaluatedKey } = (await this.workOrderEntity.query(
          GSI1PK,
          {
            startKey,
            limit: 20,
            reverse: true,
            beginsWith: `${ENTITY_KEY.WORK_ORDER}#`,
            index: INDEXES.GSI1,
          }
        ));
        startKey = LastEvaluatedKey as StartKey;
        Items?.length && workOrders.push(...Items);
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey);
    return workOrders;
  }

  public async getAllForTenant({ tenantEmail }: { tenantEmail: string; }) {
    let startKey: StartKey;
    const workOrders = [];
    const GSI2PK = generateKey(ENTITY_KEY.TENANT + ENTITY_KEY.WORK_ORDER, tenantEmail?.toLowerCase());
    do {
      try {
        const { Items, LastEvaluatedKey } = (await this.workOrderEntity.query(
          GSI2PK,
          {
            startKey,
            limit: 20,
            reverse: true,
            beginsWith: `${ENTITY_KEY.WORK_ORDER}#`,
            index: INDEXES.GSI2,
          }
        ));
        startKey = LastEvaluatedKey as StartKey;
        Items?.length && workOrders.push(...Items);
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey);
    return workOrders;
  }

  public async getAllForTechnician({ technicianEmail }: { technicianEmail: string; }) {
    let startKey: StartKey;
    const workOrders: IWorkOrder[] = [];

    const GSI3PK = generateKey(ENTITY_KEY.TECHNICIAN + ENTITY_KEY.WORK_ORDER, technicianEmail.toLowerCase());
    do {
      try {
        const { Items, LastEvaluatedKey } = (await PillarDynamoTable.query(
          GSI3PK,
          {
            startKey,
            limit: 20,
            reverse: true,
            beginsWith: `${ENTITY_KEY.WORK_ORDER}#`,
            index: INDEXES.GSI3
          }
        ));
        startKey = LastEvaluatedKey as StartKey;
        workOrders.push(...(Items ?? []) as IWorkOrder[]);
      } catch (err) {
        console.log({ err });
      }
    } while (!!startKey);
    return workOrders;
  }

  public async update({ pk, status, permissionToEnter }: { pk: string, sk: string; status: WorkOrderStatus; permissionToEnter?: "yes" | "no"; }) {
    let startKey: StartKey;
    const workOrders = [];
    try {
      do {
        try {
          const { Items, LastEvaluatedKey } = await this.workOrderEntity.query(pk, {
            limit: 20,
            reverse: true,
            beginsWith: `${ENTITY_KEY.WORK_ORDER}`,
            startKey
          });
          startKey = LastEvaluatedKey as StartKey;
          Items?.length && workOrders.push(...Items);
        } catch (err) {
          console.log({ err });
        }
      } while (!!startKey);

      let result = null;
      for (const workOrder of workOrders) {
        result = await this.workOrderEntity.update({
          pk: workOrder.pk,
          sk: workOrder.sk,
          ...(status && { status }),
          ...(permissionToEnter && { permissionToEnter })
        }, { returnValues: "ALL_NEW", strictSchemaCheck: true });
      }
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async assignTechnician({
    workOrderId,
    technicianEmail,
    address,
    status,
    issueDescription,
    permissionToEnter,
    pmEmail }: AssignTechnicianProps) {
    const workOrderIdKey = generateKey(ENTITY_KEY.WORK_ORDER, workOrderId);
    try {
      // Create companion row for the technician
      await this.workOrderEntity.update({
        pk: workOrderIdKey,
        sk: generateKey(ENTITY_KEY.WORK_ORDER + ENTITY_KEY.TECHNICIAN, technicianEmail.toLowerCase()),
        address: this.generateAddress(address),
        GSI3PK: generateKey(ENTITY_KEY.TECHNICIAN + ENTITY_KEY.WORK_ORDER, technicianEmail.toLowerCase()),
        GSI3SK: workOrderIdKey,
        issue: issueDescription.toLowerCase(),
        permissionToEnter,
        assignedTo: {
          $add: [technicianEmail.toLowerCase()]
        },
        pmEmail,
        status
      });

      const result = await this.workOrderEntity.update({
        pk: workOrderIdKey,
        sk: workOrderIdKey,
        assignedTo: {
          $add: [technicianEmail.toLowerCase()]
        }
      }, { returnValues: "ALL_NEW" });

      return result.Attributes ?? null;


    } catch (err) {
      console.log({ err });
    }
  }

  public async removeTechnician({ woId, technicianEmail }: { woId: string; technicianEmail: string; }) {
    const key = generateKey(ENTITY_KEY.WORK_ORDER, woId);
    try {
      await this.workOrderEntity.delete({
        pk: key,
        sk: generateKey(ENTITY_KEY.WORK_ORDER + ENTITY_KEY.TECHNICIAN, technicianEmail.toLowerCase()),
      });

      const result = await this.workOrderEntity.update(
        {
          pk: key,
          sk: key,
          assignedTo: {
            $delete: [technicianEmail.toLowerCase()],
          },
        },
        { returnValues: "ALL_NEW" }
      );
      return result;
    } catch (err) {
      console.log({ err });
    }
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

}
