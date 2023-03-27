import axios from "axios";
import { useSession } from "next-auth/react";
import { createContext, Dispatch, SetStateAction, useContext, useEffect, useState } from "react";


export type ContextUser = {
  user: {
    email: string;
    name: string;
    organization?: string | null,
    properties: string[],
    tenants: string[];
    userType: "TENANT" | "PROPERTY_MANAGER";
    created: string;

    modified: string;
    pk: string;
    sk: string;

  },
  setUser: Dispatch<SetStateAction<{
    email: string;
    name: string;
    organization?: string | null | undefined;
    properties: string[];
    tenants: string[];
    userType: "TENANT" | "PROPERTY_MANAGER";
    created: string;
    modified: string;
    pk: string;
    sk: string;
  }>>;
};

export const UserContext = createContext<ContextUser>({
  user: {
    email: "",
    name: "",
    organization: null,
    properties: [],
    tenants: [],
    userType: "TENANT",
    created: "",
    modified: "",
    pk: "",
    sk: "",
  },
  setUser: () => { }
});

export const UserContextProvider = (props: any) => {
  const { data: session } = useSession();

  const [user, setUser] = useState<ContextUser["user"]>({
    email: "",
    name: "",
    organization: "",
    properties: [],
    tenants: [],
    userType: "TENANT",
    created: "",
    modified: "",
    pk: "",
    sk: "",
  });

  // Update user in context
  useEffect(() => {
    if (session?.user?.email) {
      setUser({
        ...user,
        email: session.user.email ?? "",
        name: session.user.name ?? "",
      });
    }
  }, [session]);

  useEffect(() => {


    // User is logged in but haven't fetched from DB yet.
    if (user.email && user.userType && !user.created) {
      async function createUser() {
        const { data } = await axios.post("/api/create-new-user", { email: "fake@fake.com", userType: user.userType });
        const { response } = data;
        const parsedUser = JSON.parse(response);
        if (parsedUser.modified) {
          setUser(parsedUser);
        }
      }
      createUser();
    }
  }, [user.email]);

  return (
    <UserContext.Provider
      value={{
        user: user,
        setUser
      }}
    >
      {props.children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);