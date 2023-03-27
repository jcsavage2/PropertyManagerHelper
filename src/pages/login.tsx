import { useUserContext } from "@/context/user";
import { useSession, signIn, signOut } from "next-auth/react";

const Login = () => {
	const { user } = useUserContext();
	return (
		<>
			<main className='text-center'>
				<div>

					{user.name ? (
						<>
							<h3 className='text-slate-400 text-2xl mt-6 mb-12'>Welcome, {user.name}</h3>
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
	);
};

export default Login;