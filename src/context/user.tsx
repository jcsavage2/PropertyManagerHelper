import axios from "axios";
import { signOut, useSession } from "next-auth/react";
import { createContext, Dispatch, SetStateAction, useCallback, useContext, useEffect, useState } from "react";
import { useUserTypeContext } from "./user-type";


export type ContextUser = {
  user: {
    email: string;
    name: string;
    organization?: string | null,
    properties: string[],
    tenants: string[];
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
    created: string;
    modified: string;
    pk: string;
    sk: string;
  }>>;
  createUserInDB: (userType: "TENANT" | "PROPERTY_MANAGER") => void;
};

export const UserContext = createContext<ContextUser>({
  user: {
    email: "",
    name: "",
    organization: null,
    properties: [],
    tenants: [],
    created: "",
    modified: "",
    pk: "",
    sk: "",
  },
  setUser: () => { },
  createUserInDB: () => { }
});

export const UserContextProvider = (props: any) => {
  const { data: session } = useSession();
  const initialState = {
    email: "",
    name: "",
    organization: "",
    properties: [],
    tenants: [],
    created: "",
    modified: "",
    pk: "",
    sk: "",
  };
  const [user, setUser] = useState<ContextUser["user"]>(initialState);
  const { type } = useUserTypeContext();

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

    if (session?.user?.email) {
      signOut();
    }
  }, [type]);



  const createUserInDB = (userType: "TENANT" | "PROPERTY_MANAGER") => {

    if (user.email && !user.created) {
      async function createUser() {
        const { data } = await axios.post("/api/create-new-user", { email: user.email, userType });
        const { response } = data;
        console.log({ response });
        const parsedUser = JSON.parse(response);
        if (parsedUser.modified) {
          setUser(parsedUser);
        }
      }
      createUser();
    }
  };
  console.log({ user });

  return (
    <UserContext.Provider
      value={{
        user: user,
        createUserInDB,
        setUser
      }}
    >
      {props.children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
