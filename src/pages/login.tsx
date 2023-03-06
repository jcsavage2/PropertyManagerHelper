import { useSession, signIn, signOut } from "next-auth/react"

const Login = () => {
	const { data: session } = useSession()
	console.log({ session })
	if (session?.user?.name) {
		return (
			<div>
				<p>Welcome {session.user.name}</p>
				<button onClick={() => signOut()}>Sign out</button>
			</div>
		)
	} else {
		return (
			<div>
				<p>Login dude!</p>
				<button onClick={() => signIn()}>Sign in</button>
			</div>
		)
	}

}

export default Login