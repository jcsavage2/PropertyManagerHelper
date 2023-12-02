import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { constructNameEmailString, generateKSUID, generateKey } from '@/utils';
import { UserType } from './user';
import { PAGE_SIZE, WO_STATUS } from '@/constants';
import {
  AssignTechnicianBody,
  GetAllWorkOrdersForUser,
  PTE_Type,
  Property,
  PropertyWithId,
  UpdateImages,
  WoStatus,
} from '@/types';

type CreateWorkOrderProps = {
  uuid: string;
  address: string;
  tenantEmail: string;
  tenantName: string;
  unit?: string;
  images: string[];
  createdBy: string;
  createdByType: UserType;
  state: string;
  permissionToEnter: PTE_Type;
  organization: string;
  city: string;
  country: string;
  postalCode: string;
  pmEmail: string;
  status: WoStatus;
  issue: string;
  location: string;
  additionalDetails: string;
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
  images: string[];
  additionalDetails: string;
  permissionToEnter: PTE_Type;
  tenantEmail: string;
  createdBy: string;
  createdByType: UserType;
  tenantName: string;
  address: Property;
  status: WoStatus;
  assignedTo: Set<string>;
  viewedWO: string[];
}

export class WorkOrderEntity {
  private workOrderEntity = new Entity({
    name: ENTITIES.WORK_ORDER,
    attributes: {
      pk: { partitionKey: true }, //woId
      sk: { sortKey: true },
      GSI1PK: { type: 'string' }, //PM email
      GSI1SK: { type: 'string' }, //ksuID - same for all GSISK
      GSI2PK: { type: 'string' }, //Tenant email
      GSI2SK: { type: 'string' },
      GSI3PK: { type: 'string' }, //Technician email
      GSI3SK: { type: 'string' },
      GSI4PK: { type: 'string' }, //Org Id
      GSI4SK: { type: 'string' },
      permissionToEnter: { type: 'string' },
      pmEmail: { type: 'string' },
      organization: { type: 'string' },
      images: { type: 'set' },
      issue: { type: 'string' },
      location: { type: 'string' },
      additionalDetails: { type: 'string' },
      tenantEmail: { type: 'string' },
      tenantName: { type: 'string' },
      address: { type: 'map' },
      status: { type: 'string' },
      createdBy: { type: 'string' },
      createdByType: { type: 'string' },
      assignedTo: { type: 'set' }, //List of concatenated strings like: technicianEmail##NAME##technicianName
      viewedWO: { type: 'set' }, //List of assigned tech emails who have opened the WO
    },
    table: PillarDynamoTable,
  } as const);

  /**
   * Create a work order entity.
   */
  public async create({
    uuid,
    address,
    country = 'US',
    city,
    createdBy,
    createdByType,
    state,
    postalCode,
    permissionToEnter,
    unit,
    pmEmail,
    status,
    issue,
    images,
    organization,
    location,
    additionalDetails,
    tenantName,
    tenantEmail,
  }: CreateWorkOrderProps) {
    const workOrderIdKey = generateKey(ENTITY_KEY.WORK_ORDER, uuid);

    const ksuID = generateKSUID();
    const result = await this.workOrderEntity.update(
      {
        pk: workOrderIdKey,
        sk: workOrderIdKey,
        GSI1PK: generateKey(
          ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.WORK_ORDER,
          pmEmail
        ),
        GSI1SK: ksuID,
        GSI2PK: generateKey(ENTITY_KEY.TENANT + ENTITY_KEY.WORK_ORDER, tenantEmail),
        GSI2SK: ksuID,
        GSI4PK: generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.WORK_ORDER, organization),
        GSI4SK: ksuID,
        permissionToEnter,
        pmEmail,
        createdBy,
        createdByType,
        tenantEmail,
        tenantName,
        ...(images.length && { images }),
        status,
        address: this.generateAddress({
          address,
          country,
          city,
          state,
          postalCode,
          unit,
        } as Property),
        issue,
        organization,
        location,
        additionalDetails,
      },
      { returnValues: 'ALL_NEW' }
    );
    return result.Attributes;
  }

  public async get({ pk, sk }: { pk: string; sk: string }) {
    try {
      const params = {
        pk,
        sk,
      };
      const result = await this.workOrderEntity.get(params, { consistent: false });
      return result.Item;
    } catch (err) {
      console.log({ err });
      return null;
    }
  }

  //Soft delete work order
  public async delete({ pk, sk }: { pk: string; sk: string }) {
    const result = await this.workOrderEntity.update(
      {
        pk: pk,
        sk: sk,
        status: WO_STATUS.DELETED,
      },
      { returnValues: 'ALL_NEW', strictSchemaCheck: true }
    );
    return result;
  }

  /**
   *
   * @returns work orders for a given user, based on userType. If org is passed, fetch all for the organization.
   */
  public async getAllForUser({
    email,
    userType,
    orgId,
    startKey,
    statusFilter,
    reverse = true,
  }: GetAllWorkOrdersForUser) {
    const workOrders: IWorkOrder[] = [];
    let pk: string = '';
    let index: undefined | string;
    if (orgId) {
      pk = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.WORK_ORDER, orgId);
      index = INDEXES.GSI4;
    } else {
      switch (userType) {
        case ENTITIES.PROPERTY_MANAGER:
          pk = generateKey(
            ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.WORK_ORDER,
            email?.toLowerCase()
          );
          index = INDEXES.GSI1;
          break;
        case ENTITIES.TECHNICIAN:
          pk = generateKey(ENTITY_KEY.TECHNICIAN + ENTITY_KEY.WORK_ORDER, email.toLowerCase());
          index = INDEXES.GSI3;
          break;
        case ENTITIES.TENANT:
          pk = generateKey(ENTITY_KEY.TENANT + ENTITY_KEY.WORK_ORDER, email?.toLowerCase());
          index = INDEXES.GSI2;
          break;
        default:
          throw new Error('No user type or organization sent when querying work orders');
      }
    }

    let remainingWOToFetch = PAGE_SIZE;

    do {
      const options = {
        ...(statusFilter.COMPLETE &&
          !statusFilter.TO_DO && {
            filters: [{ attr: 'status', eq: WO_STATUS.COMPLETE }],
          }),
        ...(!statusFilter.COMPLETE &&
          statusFilter.TO_DO && {
            filters: [{ attr: 'status', eq: WO_STATUS.TO_DO }],
          }),
        ...(statusFilter.COMPLETE &&
          statusFilter.TO_DO && {
            filters: [{ attr: 'status', ne: WO_STATUS.DELETED }],
          }),
        ...(!statusFilter.COMPLETE &&
          !statusFilter.TO_DO && {
            filters: [{ attr: 'status', eq: WO_STATUS.DELETED }],
          }),
        limit: remainingWOToFetch,
        reverse,
        ...(index && { index }),
        ...(startKey && { startKey }),
      };
      const { Items, LastEvaluatedKey } = await PillarDynamoTable.query(pk, options);
      startKey = LastEvaluatedKey as StartKey;
      remainingWOToFetch -= Items?.length ?? 0;
      workOrders.push(...((Items ?? []) as IWorkOrder[]));
    } while (!!startKey && remainingWOToFetch > 0);
    return { workOrders, startKey };
  }

  //Update in a loop to ensure we update all companion rows for a WO
  public async update({
    pk,
    status,
    permissionToEnter,
    assignedTo,
    viewedWO,
  }: {
    pk: string;
    status?: WoStatus;
    permissionToEnter?: PTE_Type;
    assignedTo?: string[];
    viewedWO?: string[];
  }) {
    let startKey: StartKey;
    const workOrders = [];
    try {
      do {
        try {
          const { Items, LastEvaluatedKey } = await this.workOrderEntity.query(pk, {
            reverse: true,
            beginsWith: `${ENTITY_KEY.WORK_ORDER}`,
            startKey,
          });
          startKey = LastEvaluatedKey as StartKey;
          Items?.length && workOrders.push(...Items);
        } catch (err) {
          console.log({ err });
        }
      } while (!!startKey);

      let result = null;
      for (const workOrder of workOrders) {
        result = await this.workOrderEntity.update(
          {
            pk: workOrder.pk,
            sk: workOrder.sk,
            ...(status && { status: status }),
            ...(permissionToEnter && { permissionToEnter }),
            ...(assignedTo && { assignedTo }),
            ...(viewedWO && { viewedWO }),
          },
          { returnValues: 'ALL_NEW', strictSchemaCheck: true }
        );
      }
      return result?.Attributes;
    } catch (err) {
      console.log({ err });
    }
  }

  public async assignTechnician({
    organization,
    ksuID,
    workOrderId,
    technicianEmail,
    technicianName,
    property,
    status,
    issueDescription,
    permissionToEnter,
    pmEmail,
    pmName,
    tenantEmail,
    tenantName,
    oldAssignedTo,
  }: AssignTechnicianBody) {
    const workOrderIdKey = generateKey(ENTITY_KEY.WORK_ORDER, workOrderId);
    try {
      let assignedTo: string[] = [
        ...oldAssignedTo,
        constructNameEmailString(technicianEmail, technicianName),
      ];
      // Create companion row for the technician
      await this.workOrderEntity.update({
        pk: workOrderIdKey,
        sk: generateKey(
          ENTITY_KEY.WORK_ORDER + ENTITY_KEY.TECHNICIAN,
          technicianEmail
        ),
        address: this.generateAddress(property),
        GSI3PK: generateKey(
          ENTITY_KEY.TECHNICIAN + ENTITY_KEY.WORK_ORDER,
          technicianEmail
        ),
        GSI3SK: ksuID,
        issue: issueDescription,
        permissionToEnter,
        assignedTo,
        pmEmail,
        status,
        organization,
        tenantEmail,
        tenantName,
      });

      //Need to update all companion rows for the work order
      const result = await this.update({
        pk: workOrderIdKey,
        assignedTo,
      });

      return result ?? null;
    } catch (err) {
      console.log({ err });
    }
  }

  public async removeTechnician({
    workOrderId,
    technicianEmail,
    technicianName,
    assignedTo,
    viewedWO,
  }: {
    workOrderId: string;
    technicianEmail: string;
    technicianName: string;
    assignedTo: string[];
    viewedWO: string[];
  }) {
    const key = generateKey(ENTITY_KEY.WORK_ORDER, workOrderId);
    try {
      //Delete relationship between WO and technician
      await this.workOrderEntity.delete({
        pk: key,
        sk: generateKey(
          ENTITY_KEY.WORK_ORDER + ENTITY_KEY.TECHNICIAN,
          technicianEmail
        ),
      });

      //Backwards compatibility when removing technicians from WO
      let newAssignedTo: string[];
      const oldAssignedTo = [...assignedTo];
      if (
        oldAssignedTo.includes(
          constructNameEmailString(technicianEmail, technicianName)
        )
      ) {
        newAssignedTo = [...oldAssignedTo].filter(
          (assignedTo) =>
            assignedTo !== constructNameEmailString(technicianEmail, technicianName)
        );
      } else {
        newAssignedTo = [...oldAssignedTo].filter(
          (assignedTo) => assignedTo !== technicianEmail
        );
      }
      const newViewedWOList = [...viewedWO].filter(
        (email) => email !== technicianEmail
      );

      const result = await this.workOrderEntity.update(
        {
          pk: key,
          sk: key,
          assignedTo: newAssignedTo,
          viewedWO: newViewedWOList,
        },
        { returnValues: 'ALL_NEW' }
      );
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async updateImages({ pk, sk, images, addNew }: UpdateImages) {
    try {
      const updatedWorkOrder = (
        await this.workOrderEntity.update({ pk, sk, images }, { returnValues: 'ALL_NEW' })
      ).Attributes;
      return updatedWorkOrder;
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
  }: Property | PropertyWithId) {
    return {
      address,
      unit,
      city,
      state,
      postalCode,
      country,
    };
  }
}
