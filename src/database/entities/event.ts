import { Entity } from 'dynamodb-toolbox';
import { ENTITIES, ENTITY_KEY, StartKey } from '.';
import { PillarDynamoTable } from '..';
import { generateKSUID, generateKey } from '@/utils';
import { PAGE_SIZE } from '@/constants';
import { GetWorkOrderEvents } from '@/types';

type CreateEventProps = {
  workOrderId: string;
  madeByEmail: string;
  madeByName: string;
  message?: string;
  ksuId?: string;
};

export interface IEvent {
  pk: string; //EV:workOrderId
  sk: string; //ksuid
  madeByEmail: string;
  madeByName: string;
  message?: string;
  created?: string;
}

export class EventEntity {
  private eventEntity = new Entity({
    name: ENTITIES.EVENT,
    attributes: {
      pk: { partitionKey: true }, //EV#workOrderId:type
      sk: { sortKey: true }, //ksuid
      madeByEmail: { type: 'string' },
      madeByName: { type: 'string' },
      message: { type: 'string' },
    },
    table: PillarDynamoTable,
  });

  /**
   * Creates a new event attached to a work order
   */
  public async create({ workOrderId, madeByEmail, madeByName, message, ksuId }: CreateEventProps) {
    const result = await this.eventEntity.update(
      {
        pk: generateKey(ENTITY_KEY.EVENT, workOrderId),
        sk: ksuId ?? generateKSUID(), //allows us to sort by date
        madeByEmail,
        madeByName,
        message,
      },
      { returnValues: 'ALL_NEW' }
    );
    return result.Attributes;
  }

  /**
   * @returns All events for a work order
   */
  public async getEvents({ workOrderId, startKey }: GetWorkOrderEvents) {
    const { Items, LastEvaluatedKey } = await this.eventEntity.query(
      generateKey(ENTITY_KEY.EVENT, workOrderId),
      {
        startKey,
        reverse: true,
        limit: PAGE_SIZE,
      }
    );
    startKey = LastEvaluatedKey as StartKey;
    return { events: Items ?? [], startKey };
  }

  public async delete({ pk, sk }: { pk: string; sk: string }) {
    const params = {
      pk,
      sk,
    };
    const result = await this.eventEntity.delete(params);
    return result;
  }
}
