import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { Table } from 'dynamodb-toolbox';

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.REGION;

if (!accessKeyId || !secretAccessKey || !region) {
  throw new Error('missing aws credentials');
}

export const DynamoDBClientConfig = {
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
  region: process.env.REGION,
};

const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: false, // false, by default.
};

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
};

const translateConfig = { marshallOptions, unmarshallOptions };

export const DocumentClient = DynamoDBDocument.from(new DynamoDB({ ...DynamoDBClientConfig }), translateConfig);

export const INDEXES = {
  GSI1: 'GSI1PK-GSI1SK-index', // property manager index
  GSI2: 'tenant-index', // tenant index
  GSI3: 'technician-index', // technician index
} as const;

export const PillarDynamoTable = new Table({
  name: 'pillar-hq',
  partitionKey: 'pk',
  sortKey: 'sk',
  indexes: {
    [INDEXES.GSI1]: { partitionKey: 'GSI1PK', sortKey: 'GSI1SK' }, // PM Email
    [INDEXES.GSI2]: { partitionKey: 'GSI2PK', sortKey: 'GSI2SK' }, // Tenant Email
    [INDEXES.GSI3]: { partitionKey: 'GSI3PK', sortKey: 'GSI3SK' }, // Technician Email
  },
  removeNullAttributes: true,
  DocumentClient,
});

export type Data = {
  response: string;
};

export class IBaseEntity {
  pk: string;
  sk: string;
  created?: string;
  entity?: string;
  modified?: string;
  ttl?: number;
}
