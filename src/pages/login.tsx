import { useSession, signIn, signOut } from "next-auth/react"

const Login = () => {
	const { data: session } = useSession()


	return (
		<>
			<main className='text-center'>
				<div>
					<h1 className='text-slate-200 text-3xl mt-12'>Property Manager Helper</h1>
					{session?.user?.name ? (
						<>
							<h3 className='text-slate-400 text-2xl mt-6 mb-12'>Welcome, {session?.user?.name}</h3>
							<button onClick={() => signOut()} className="border-1 text-xl hover:bg-orange-600 bg-orange-500 rounded-sm py-6 px-12">
								Sign Out
							</button>
						</>
					) : (
						<>
							<h3 className='text-slate-400 text-2xl mt-6 mb-12'>Welcome</h3>
							<button onClick={() => signIn()} className="border-1 border-solid border-slate-500 hover:border-slate-100 bg-orange-500 rounded-sm p-4">
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