import { PropertyManagerEntity } from "@/database/entities/property-manager";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";


const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
	throw new Error("Missing Google Credentials!");
}



export default NextAuth({
	providers: [
		GoogleProvider({
			clientId,
			clientSecret
		})
	],
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
		}
	},
	secret: process.env.JWT_SECRET
});