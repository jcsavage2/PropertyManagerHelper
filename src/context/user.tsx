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
    userType: string;
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
    userType: string;
    pk: string;
    sk: string;
  }>>;
  createUserInDB: ({ email, userType, propertyManagerEmail }: {
    email: string;
    userType: "TENANT" | "PROPERTY_MANAGER";
    propertyManagerEmail?: string;
  }) => void;

  login: any;
  logOut: () => void;
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
    userType: "",
    pk: "",
    sk: "",
  },
  setUser: () => { },
  createUserInDB: () => { },
  login: () => { },
  logOut: () => { }
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
    userType: "",
    pk: "",
    sk: "",
  };
  const [user, setUser] = useState<ContextUser["user"]>(initialState);

  // Update user in context
  useEffect(() => {
    const sessionUser = window.sessionStorage.getItem("PILLAR::USER");

    if (sessionUser) {
      const parsedSessionUser = JSON.parse(sessionUser);
      setUser(parsedSessionUser);
    } else if (session?.user?.email) {
      setUser({
        ...user,
        email: session.user.email ?? "",
        name: session.user.name ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const login = ({ email, userType }: { email: string; userType: "TENANT" | "PROPERTY_MANAGER"; }) => {
    if (user.email && !user.created) {
      async function createUser() {
        const { data } = await axios.post("/api/create-new-user", { email, userType });
        const { response } = data;
        const parsedUser = JSON.parse(response);
        if (parsedUser.modified) {
          console.log("parsed");
          console.log(parsedUser);
          window.sessionStorage.setItem("PILLAR::USER", JSON.stringify(parsedUser));
          setUser(parsedUser);
        }
      }
      createUser();
    }
  };

  const logOut = () => {
    window.sessionStorage.removeItem("PILLAR::USER");
    signOut();
  };

  const createUserInDB = ({ email, userType, propertyManagerEmail }: { email: string; userType: "TENANT" | "PROPERTY_MANAGER"; propertyManagerEmail?: string; }) => {
    if (user.email) {
      async function createUser() {
        const { data } = await axios.post("/api/create-new-user", { email, userType, propertyManagerEmail });
        const { response } = data;
        const parsedUser = JSON.parse(response);
        if (parsedUser.modified) {
          setUser(parsedUser);
        }
      }
      createUser();
    }
  };

  return (
    <UserContext.Provider
      value={{
        user: user,
        createUserInDB,
        setUser,
        login,
        logOut
      }}
    >
      {props.children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
