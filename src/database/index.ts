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

export const PillarDynamoTable = new Table({
  name: 'pillar-hq',
  partitionKey: 'pk',
  sortKey: 'sk',
  removeNullAttributes: true,
  DocumentClient
});

export type Data = {
  response: string;
};

export class BaseEntity {
  pk: string;
  sk: string;
  created?: string;
  entity?: string;
  modified?: string;
  ttl?: number;
}