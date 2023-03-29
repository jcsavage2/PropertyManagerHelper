import { useUserContext } from "@/context/user";
import { useRouter } from "next/router";

const Home = () => {
  const router = useRouter();
  const { user, login } = useUserContext();
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
          {user.email ? "Sign Out" : "Sign In/Sign Up"}
        </button>
        <br />
        {user.email && (
          <>
            <br />
            <button
              className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
              onClick={() => login({ email: user.email, userType: "TENANT" })}>Continue as Tenant</button>
            <br />
            <button
              className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
              onClick={() => login({ email: user.email, userType: "PROPERTY_MANAGER" })}>Continue as Property Manager</button>
          </>
        )}
      </div>
    </>
  );
};

export default Home;