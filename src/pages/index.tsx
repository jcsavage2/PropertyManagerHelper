import { useUserContext } from "@/context/user";
import { useRouter } from "next/router";

const Home = () => {
  const router = useRouter();
  const { user, setUser } = useUserContext();
  return (
    <>
      <div className="text-center">
        <h1>Pillar property management app home</h1>
        <button
          onClick={() => {
            setUser({ ...user, userType: "TENANT" });
            router.push("login");
          }}
          className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
        >
          Tenant Login
        </button>
        <br />
        <button
          onClick={() => {
            setUser({ ...user, userType: "PROPERTY_MANAGER" });
            router.push("login");
          }}
          className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
        >
          Property Manager Login
        </button>
      </div>
    </>
  );
};

export default Home;