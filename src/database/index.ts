import DynamoDB from 'aws-sdk/clients/dynamodb';
import { Table } from 'dynamodb-toolbox';


const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;
if (!accessKeyId || !secretAccessKey || !region) {
  throw new Error("missing aws credentials");
}

export const DynamoDBClientConfig = {
    credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
    },
    region: process.env.AWS_REGION,
}

export const DocumentClient = new DynamoDB.DocumentClient({...DynamoDBClientConfig, convertEmptyValues: false});

export const PillarDynamoTable = new Table({
  //DynamoDB Table Name
  name: 'pillar-hq',

  // Define partition and sort keys
  partitionKey: 'pk',
  sortKey: 'sk',
  
  removeNullAttributes: true,
  DocumentClient // Add the DocumentClient
});

const NextAuthTable = new Table({
  name: "next-auth",
  partitionKey: "pk",
  sortKey: "sk",
  indexes: {
    GSI1: { partitionKey: "GSI1PK", sortKey: "GSI1SK" },
  },
  DocumentClient
})

export class BaseEntity {
  pk: string;
  sk: string;
  created?: string;
  entity?: string;
  modified?: string;
  ttl?: number;
}