import { useSession, signIn, signOut } from "next-auth/react"

const Login = () => {
	const { data: session } = useSession()
	return (
		<>
			<main className='text-center'>
				<div>

					{session?.user?.name ? (
						<>
							<h3 className='text-slate-400 text-2xl mt-6 mb-12'>Welcome, {session?.user?.name}</h3>
							<button
								onClick={() => signOut()}
								className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
							>
								Sign Out
							</button>
						</>
					) : (
						<>
							<h3 className='text-slate-400 text-2xl mt-6 mb-12'>Welcome!</h3>
							<button
								onClick={() => signIn()}
								className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
							>
								Sign In/Sign Up
							</button>
						</>
					)}

				</div>
			</main>
		</>
	)
}

export default Login