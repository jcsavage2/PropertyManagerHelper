import DynamoDB from 'aws-sdk/clients/dynamodb';
import { Table } from 'dynamodb-toolbox';


const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.REGION;

if (!accessKeyId || !secretAccessKey || !region) {
  throw new Error("missing aws credentials");
}

export const DynamoDBClientConfig = {
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
  region: process.env.REGION,
};

export const DocumentClient = new DynamoDB.DocumentClient({ ...DynamoDBClientConfig, convertEmptyValues: false });

export const INDEXES = {
  GSI1: "GSI1PK-GSI1SK-index",
  GSI2: "tenant-index",
  GSI3: "technician-index",
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
  DocumentClient
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