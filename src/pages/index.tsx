import { useUserContext } from "@/context/user";
import { useRouter } from "next/router";

const Home = () => {
  const router = useRouter();
  const { user, login, sessionUser } = useUserContext();
  console.log("here");
  console.log({ sessionUser });

  return (
    <>
      <div className="text-center">
        <h1>Pillar property management app home</h1>
        <button
          onClick={() => {
            router.push("login");
          }}
          className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
        >
          {sessionUser?.email ? "Sign Out" : "Sign In/Sign Up"}
        </button>
        <br />
        {!!sessionUser?.email && (
          <>
            <br />
            <button
              className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
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
                router.push("/portal");
              }}>Continue as Property Manager</button>
          </>
        )}
      </div>
    </>
  );
};

export default Home;