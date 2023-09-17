import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import Email from 'next-auth/providers/email';
import { DynamoDBAdapter } from '@next-auth/dynamodb-adapter';
import { DynamoDBClientConfig } from '@/database';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { UserEntity } from '@/database/entities/user';
import { InviteStatusType } from '@/utils/user-types';

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const clientSecret = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;
const region = process.env.NEXT_PUBLIC_REGION;

const emailHost = 'smtp.sendgrid.net';
const emailUsername = 'apikey'; // <- don't replace "apikey" it's the actual username
const smtpPort = 'apikey'; // <- don't replace "apikey" it's the actual username
const emailPassword = process.env.NEXT_PUBLIC_SMTP_PASSWORD;

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

export const options: NextAuthOptions = {
	providers: [
		Email({
			server: `smtp://${emailUsername}:${emailPassword}@${emailHost}:${smtpPort}`,
			from: 'pillar@pillarhq.co',
		}),
		GoogleProvider({
			clientId,
			clientSecret,
		}),
	],
	callbacks: {
		async signIn({ user }) {
			if (user.email) {
				const userEntity = new UserEntity();
				const userFromDB = await userEntity.get({ email: user.email.toLowerCase() });
				if (!userFromDB) {
					// Users first time on the app, but they were not invited
					await userEntity.createBaseUser({ email: user.email });
					return "/unautorized";
				} else if (!userFromDB.organization) {
					return "/unauthorized";
				}
			}
			return true;
		},

		// Send user properties to the client.
		// Creates the user if the user does not already exist in the database. 
		async session({ session, user }) {
			if (user.email) {
				let userFromDB;
				const userEntity = new UserEntity();
				userFromDB = await userEntity.get({ email: user?.email.toLowerCase() });
				if (userFromDB) {
					session.user = { ...session.user, ...userFromDB };
				} else {
					// Users first time on the app, but they were not invited
					userFromDB = await userEntity.createBaseUser({ email: user.email });
					session.user = { ...session.user, ...userFromDB };
				}
				const userStatus = userFromDB?.status as InviteStatusType;

				// User's first time on the application, mark them as joined.
				if (userStatus === "INVITED") {
					const updatedUser = await userEntity.updateInviteStatus({ pk: userFromDB?.pk, sk: userFromDB?.sk, status: "JOINED" });
					userFromDB = updatedUser;
					session.user = { ...session.user, ...userFromDB };
				}
			}
			return session;
		},
	},
	session: {
		maxAge: 30 * 24 * 60 * 60, // Max Age: 60 days
	},
	adapter: DynamoDBAdapter(client),
	secret: process.env.NEXT_PUBLIC_JWT_SECRET,
};

export default NextAuth(options);
