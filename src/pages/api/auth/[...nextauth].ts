import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google"


const clientId = process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET
if (!clientId || !clientSecret) {
	throw new Error("Missing Google Credentials!")
}

export default NextAuth({
	providers: [
		GoogleProvider({
			clientId,
			clientSecret
		})
	],
	secret: process.env.JWT_SECRET
})