import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import Email from 'next-auth/providers/email';
import { DynamoDBAdapter } from '@next-auth/dynamodb-adapter';
import { DynamoDBClientConfig } from '@/database';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { PropertyManagerEntity } from '@/database/entities/property-manager';
import { UserEntity } from '@/database/entities/user';

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
    callbacks: {
        // Send user properties to the client.
        // Creates the user if the user does not already exist in the database. 
        async session({ session, user }) {
            if (user.email) {
                const userEntity = new UserEntity();
                //@ts-ignore
                const existingUser = await userEntity.get({ email: user.email })?.Item ?? null;
                if (existingUser) {
                    session.user = { ...session.user, ...existingUser };
                } else {
                    const newUser = await userEntity.create({ email: user.email });
                    if (newUser) {
                        // @ts-ignore
                        session.user = { ...session.user, ...newUser?.Attributes };
                    }
                }
            }
            return session;
        },
    },
    adapter: DynamoDBAdapter(client),
    secret: process.env.JWT_SECRET,
});
