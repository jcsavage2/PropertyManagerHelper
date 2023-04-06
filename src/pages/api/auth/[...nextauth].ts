import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import Email from 'next-auth/providers/email';
import { DynamoDBAdapter } from '@next-auth/dynamodb-adapter';
import { DynamoDBClientConfig } from '@/database';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const region = process.env.REGION;

const emailHost = 'smtp.sendgrid.net';
const emailUsername = 'apikey'; // <- don't replace "apikey" it's the actual username
const smtpPort = 'apikey'; // <- don't replace "apikey" it's the actual username
const emailPassword = process.env.SMTP_PASSWORD;

if (!clientId || !clientSecret || !region) {
    throw new Error('Missing Auth Credentials!');
}

const client = DynamoDBDocument.from(new DynamoDB(DynamoDBClientConfig), {
    marshallOptions: {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    },
});

export default NextAuth({
    providers: [
        Email({
            server: `smtp://${emailUsername}:${emailPassword}@${emailHost}:${smtpPort}`,
            from: 'dylan@pillarhq.co',
        }),
        GoogleProvider({
            clientId,
            clientSecret,
        }),
    ],
    adapter: DynamoDBAdapter(client),
    secret: process.env.JWT_SECRET,
});
