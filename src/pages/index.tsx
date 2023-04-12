import { useUserContext } from "@/context/user";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";

const Home = () => {
  const router = useRouter();
  const { user, login, sessionUser } = useUserContext();

  return (
    <>
      <div className="text-center">
        <h1 className="mt-12 text-3xl">Pillar Property Management</h1>
        <br />
        {!sessionUser?.email && (
          <button
            onClick={() => signIn()}
            className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25">
            Sign In/Sign Up
          </button>
        )}
        {!!sessionUser?.email && (
          <div className="" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <button
              className="justify-self-center bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-9/12 md:w-6/12"
              onClick={async () => {
                await login({ email: sessionUser.email ?? "", userType: "TENANT", name: sessionUser.name ?? "" });
                router.push("/work-order-chatbot");
              }
              }
            >Continue as Tenant</button>

            <button
              className="justify-self-center bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-9/12 md:w-6/12"
              onClick={async () => {
                await login({ email: sessionUser.email ?? "", userType: "PROPERTY_MANAGER", name: sessionUser.name ?? "" });
                router.push("/work-orders");
              }}>Continue as Property Manager</button>
          </div>
        )}
      </div>
    </>
  );
};

export default Home;