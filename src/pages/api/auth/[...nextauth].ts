import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import Email from 'next-auth/providers/email';
import { DynamoDBAdapter } from '@next-auth/dynamodb-adapter';
import { DynamoDBClientCredentials } from '@/database';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const region = process.env.AWS_REGION;
if (!clientId || !clientSecret || !region) {
    throw new Error('Missing Auth Credentials!');
}

const client = DynamoDBDocument.from(new DynamoDB({
  region: region,
  credentials: DynamoDBClientCredentials,
}), {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
})

export default NextAuth({
    providers: [
        GoogleProvider({
            clientId,
            clientSecret,
        }),
        Email({
            server: {
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT),
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD,
                },
            },
            from: 'mitchposk@gmail.com', 
        }),
    ],
    adapter: DynamoDBAdapter(client),
    callbacks: {
        async signIn({ user, account, profile, email, credentials }) {
            return true;
        },
        async redirect({ url, baseUrl }) {
            return baseUrl;
        },
        async session({ session, user, token }) {
            return session;
        },
        async jwt({ token, user, account, profile, isNewUser }) {
            return token;
        },
    },
    secret: process.env.JWT_SECRET,
});
