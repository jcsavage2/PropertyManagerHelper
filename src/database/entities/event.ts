import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY } from '.';
import { PillarDynamoTable } from '..';
import { generateKSUID, generateKey } from '@/utils';
import { EventType } from '@/types';

type CreateEventProps = {
  workOrderId: string;
  updateType: EventType;
  updateDescription: string;
  updateMadeBy: string;
};

export interface IEvent {
  pk: string,
  sk: string,
  created: string,
  updateType: EventType;
  updateDescription: string;
  updateMadeBy: string;
};

export class WorkOrderEntity {
  private eventEntity: Entity;

  constructor() {
    this.eventEntity = new Entity({
      name: ENTITIES.EVENT,
      attributes: {
        pk: { partitionKey: true }, //EV:workOrderId
        sk: { sortKey: true }, //ksuid 
        updateType: { type: 'string' },
        updateDescription: { type: "string" },
        updateMadeBy: { type: 'string' },
      },
      table: PillarDynamoTable
    } as const);
  }

  /**
   * Creates a new event for a work order.
   */
  public async create({ workOrderId, updateType, updateDescription, updateMadeBy }: CreateEventProps) {
    const result = await this.eventEntity.put({
      pk: generateKey(ENTITY_KEY.EVENT, workOrderId),
      sk: generateKSUID(),
      updateType,
      updateDescription,
      updateMadeBy
    });
    return result.Item;
  }

  /**
   * @returns All events for a work order
   */
  public async getEvents({ woId }:
    { woId: string; }) {
    try {
      const result = (await this.eventEntity.query(
        generateKey(ENTITY_KEY.EVENT, woId)
      ));
      return result.Items ?? [];
    } catch (err) {
      console.log({ err });
    }
  }

}
