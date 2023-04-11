import { useUserContext } from "@/context/user";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";

const Home = () => {
  const router = useRouter();
  const { user, login, sessionUser } = useUserContext();

  return (
    <>
      <div className="text-center">
        <h1 className="mt-12">Pillar property management app home</h1>
        <br />
        {!sessionUser?.email && (
          <button
            onClick={() => signIn()}
            className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25">
            Sign In/Sign Up
          </button>
        )}
        {!!sessionUser?.email && (
          <>
            <br />
            <button
              className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
              onClick={async () => {
                await login({ email: sessionUser.email ?? "", userType: "TENANT", name: sessionUser.name ?? "" });
                router.push("/demo");
              }
              }
            >Continue as Tenant</button>
            <br />
            <button
              className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
              onClick={async () => {
                await login({ email: sessionUser.email ?? "", userType: "PROPERTY_MANAGER", name: sessionUser.name ?? "" });
                router.push("/work-orders");
              }}>Continue as Property Manager</button>
          </>
        )}
      </div>
    </>
  );
};

export default Home;