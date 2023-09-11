import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey } from '.';
import { INDEXES, PillarDynamoTable } from '..';
import { generateKey } from '@/utils';
import { UserType } from './user';
import { PAGE_SIZE, STATUS, STATUS_KEY } from '@/constants';
import { AssignTechnicianBody } from '@/pages/api/assign-technician';
import { PTE_Type, StatusType } from '@/types';

export interface IGetAllWorkOrdersForUserProps {
  email: string;
  userType: UserType;
  orgId?: string;
  startKey: StartKey;
  statusFilter: Record<StatusType, boolean>;
}

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
  status: StatusType;
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
  createdByType: 'TENANT' | 'PROPERTY_MANAGER' | 'TECHNICIAN';
  tenantName: string;
  address: PropertyAddress;
  status: StatusType;
  assignedTo: Set<string>;
}

export class WorkOrderEntity {
  private workOrderEntity = new Entity({
    name: ENTITIES.WORK_ORDER,
    attributes: {
      pk: { partitionKey: true }, //woId
      sk: { sortKey: true }, //woId
      GSI1PK: { type: 'string' }, //PM email
      GSI1SK: { type: 'string' }, //Status
      GSI2PK: { type: 'string' }, //Tenant email
      GSI2SK: { type: 'string' }, //Status
      GSI3PK: { type: 'string' }, //Technician email
      GSI3SK: { type: 'string' }, //Status
      GSI4PK: { type: 'string' }, //Org Id
      GSI4SK: { type: 'string' }, //Status
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
      assignedTo: { type: 'set' },
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

    //Construct status key for TODO or COMPLETE status, we need to be able to separate TODO/COMPLETE from DELETED status
    //TODO and COMPLETE require a "STATUS#" prefix, while DELETED does not
    //This allows us to query for all work orders with any valid status, without getting deleted work orders
    const statusKey = generateKey(STATUS_KEY, status);

    const result = await this.workOrderEntity.update(
      {
        pk: workOrderIdKey,
        sk: workOrderIdKey,
        GSI1PK: generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.WORK_ORDER, pmEmail.toLowerCase()),
        GSI1SK: statusKey,
        GSI2PK: generateKey(ENTITY_KEY.TENANT + ENTITY_KEY.WORK_ORDER, tenantEmail.toLowerCase()),
        GSI2SK: statusKey,
        GSI4PK: generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.WORK_ORDER, organization),
        GSI4SK: statusKey,
        permissionToEnter,
        pmEmail: pmEmail.toLowerCase(),
        createdBy: createdBy.toLowerCase(),
        createdByType,
        tenantEmail,
        tenantName,
        ...(images.length && { images }),
        status: statusKey,
        address: this.generateAddress({ address, country, city, state, postalCode, unit }),
        issue: issue.toLowerCase(),
        organization,
        location,
        additionalDetails,
      },
      { returnValues: 'ALL_NEW' }
    );
    return result.Attributes;
  }

  public async get({ pk, sk }: { pk: string; sk: string; }) {
    const params = {
      pk,
      sk,
    };
    const result = await this.workOrderEntity.get(params, { consistent: false });
    return result;
  }

  //Soft delete work order
  public async delete({ pk, sk }: { pk: string; sk: string; }) {
    const result = await this.workOrderEntity.update(
      {
        pk: pk,
        sk: sk,
        status: STATUS.DELETED,
        GSI1SK: STATUS.DELETED,
        GSI2SK: STATUS.DELETED,
        GSI4PK: STATUS.DELETED,
      },
      { returnValues: 'ALL_NEW', strictSchemaCheck: true }
    );
    return result;
  }

  /**
   *
   * @returns work orders for a given user, based on userType. If org is passed, fetch all for the organization.
   */
  public async getAllForUser({ email, userType, orgId, startKey, statusFilter }: IGetAllWorkOrdersForUserProps) {
    const workOrders: IWorkOrder[] = [];
    let pk: string = '';
    let index: undefined | string;

    if (orgId) {
      pk = generateKey(ENTITY_KEY.ORGANIZATION + ENTITY_KEY.WORK_ORDER, orgId);
      index = INDEXES.GSI4;
    } else {
      switch (userType) {
        case ENTITIES.PROPERTY_MANAGER:
          pk = generateKey(ENTITY_KEY.PROPERTY_MANAGER + ENTITY_KEY.WORK_ORDER, email?.toLowerCase());
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
        ...(statusFilter.COMPLETE && !statusFilter.TO_DO && { eq: generateKey(STATUS_KEY, STATUS.COMPLETE) }),
        ...(!statusFilter.COMPLETE && statusFilter.TO_DO && { eq: generateKey(STATUS_KEY, STATUS.TO_DO) }),
        ...(statusFilter.COMPLETE && statusFilter.TO_DO && { beginsWith: STATUS_KEY }),
        ...(!statusFilter.COMPLETE && !statusFilter.TO_DO && { eq: STATUS.DELETED }),
        limit: remainingWOToFetch,
        reverse: true,
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

  //Update in a loop to ensure we update the records for all companion rows that map technician to WO(assigned technicians)
  public async update({ pk, status, permissionToEnter }: { pk: string; sk: string; status: StatusType; permissionToEnter?: PTE_Type }) {
    let startKey: StartKey;
    const workOrders = [];
    try {
      do {
        try {
          const { Items, LastEvaluatedKey } = await this.workOrderEntity.query(pk, {
            limit: PAGE_SIZE,
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
      const statusKey = status === STATUS.DELETED ? status : generateKey(STATUS_KEY, status);
      for (const workOrder of workOrders) {
        result = await this.workOrderEntity.update(
          {
            pk: workOrder.pk,
            sk: workOrder.sk,
            ...(status && { status: statusKey }),
            ...(status && { GSI1SK: statusKey }),
            ...(status && { GSI2SK: statusKey }),
            ...(status && { GSI4PK: statusKey }),
            ...(permissionToEnter && { permissionToEnter }),
          },
          { returnValues: 'ALL_NEW', strictSchemaCheck: true }
        );
      }
      return result;
    } catch (err) {
      console.log({ err });
    }
  }

  public async assignTechnician({
    organization,
    workOrderId,
    technicianEmail,
    address,
    status,
    issueDescription,
    permissionToEnter,
    pmEmail,
    pmName,
  }: AssignTechnicianBody) {
    const workOrderIdKey = generateKey(ENTITY_KEY.WORK_ORDER, workOrderId);
    try {
      // Create companion row for the technician
      await this.workOrderEntity.update(
        {
          pk: workOrderIdKey,
          sk: generateKey(ENTITY_KEY.WORK_ORDER + ENTITY_KEY.TECHNICIAN, technicianEmail.toLowerCase()),
          address: this.generateAddress(address),
          GSI3PK: generateKey(ENTITY_KEY.TECHNICIAN + ENTITY_KEY.WORK_ORDER, technicianEmail.toLowerCase()),
          GSI3SK: status,
          issue: issueDescription.toLowerCase(),
          permissionToEnter,
          assignedTo: {
            $add: [technicianEmail.toLowerCase()],
          },
          pmEmail,
          status,
          organization,
        },
        { returnValues: 'ALL_NEW' }
      );

      const result = await this.workOrderEntity.update(
        {
          pk: workOrderIdKey,
          sk: workOrderIdKey,
          assignedTo: {
            $add: [technicianEmail.toLowerCase()],
          },
        },
        { returnValues: 'ALL_NEW' }
      );

      return result.Attributes ?? null;
    } catch (err) {
      console.log({ err });
    }
  }

  public async removeTechnician({ workOrderId, technicianEmail }: { workOrderId: string; technicianEmail: string }) {
    const key = generateKey(ENTITY_KEY.WORK_ORDER, workOrderId);
    try {
      //Delete relationship between WO and technician
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
        { returnValues: 'ALL_NEW' }
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
      address,
      unit,
      city,
      state,
      postalCode,
      country,
    };
  }
}
