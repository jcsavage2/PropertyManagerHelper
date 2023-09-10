import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey } from '.';
import { PillarDynamoTable } from '..';
import { generateKSUID, generateKey } from '@/utils';
import { EventType, UpdateType } from '@/types';
import { GetWorkOrderEvents } from '@/pages/api/get-work-order-events';
import { EVENTS } from '@/constants';

type CreateEventProps = {
  workOrderId: string;
  type: UpdateType;
  updateType?: UpdateType;
  madeByEmail: string;
  madeByName: string;
  message?: string;
  date?: string;
};

export interface IEvent {
  pk: string; //EV:workOrderId
  sk: string; //ksuid
  type: EventType;
  updateType?: UpdateType;
  madeByEmail: string;
  madeByName: string;
  message: string;
  created: string;
}

export class EventEntity {
  private eventEntity = new Entity({
    name: ENTITIES.EVENT,
    attributes: {
      pk: { partitionKey: true }, //EV#workOrderId:type
      sk: { sortKey: true }, //ksuid
      type: { type: 'string' },
      madeByEmail: { type: 'string' },
      madeByName: { type: 'string' },
      message: { type: 'string' },
    },
    table: PillarDynamoTable,
  });

  /**
   * Creates a new event attached to a work order
   */
  public async create({ workOrderId, type, madeByEmail, madeByName, message, date }: CreateEventProps) {
    const time = date ?? new Date().toUTCString();
    const result = await this.eventEntity.update(
      {
        pk: this.generateEventPK(workOrderId, type),
        sk: generateKSUID(), //allows us to sort by date
        type,
        madeByEmail,
        madeByName,
        message,
        created: time,
      },
      { returnValues: 'ALL_NEW' }
    );
    return result.Attributes;
  }

  /**
   * @returns All events for a work order
   */
  public async getEvents({ workOrderId, type, startKey }: GetWorkOrderEvents) {
    const { Items, LastEvaluatedKey } = await this.eventEntity.query(this.generateEventPK(workOrderId, type), {
      startKey,
      reverse: type !== EVENTS.CHAT ? true : false,
    });
    startKey = LastEvaluatedKey as StartKey;
    return {events: Items ?? [], startKey};
  }

  public async delete({ pk, sk }: { pk: string; sk: string }) {
    const params = {
      pk,
      sk,
    };
    const result = await this.eventEntity.delete(params);
    return result;
  }

  private generateEventPK(woId: string, type: EventType) {
    return generateKey(ENTITY_KEY.EVENT, woId) + ':' + type;
  }
}
