import { ITechnician } from "@/database/entities/technician";
import { GetOrCreateUserBody } from "@/pages/api/get-or-create-user-in-db";
import axios from "axios";
import { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import { createContext, Dispatch, SetStateAction, useContext, useEffect, useState } from "react";
type BaseUser = {
  created: string;
  modified: string;
  pk: string;
  sk: string;
};

export type PropertyManager = BaseUser & {
  pmName: string,
  pmEmail: string,
  organization: string,
  userType: "PROPERTY_MANAGER";
  tenantEmail?: never;
  tenantName?: never;
};

export type Tenant = BaseUser & {
  tenantEmail: string;
  tenantName: string;
  pmEmail?: string | null,
  status: string,
  userType: "TENANT";
  addresses: Record<string, any>;

  pmName?: never,
  organization?: never;
};

export type Technician = BaseUser & ITechnician & {
  pmEmail?: never;
};

export type UserType = Tenant | PropertyManager | Technician;

export type UserContext = {
  user: UserType,
  setUser: Dispatch<SetStateAction<UserType>>;
  login: ({ email, userType, name }: {
    email: string;
    userType: "TENANT" | "PROPERTY_MANAGER" | "TECHNICIAN";
    name: string;
  }) => Promise<void>;
  logOut: () => void;
  sessionUser: Session["user"] | null;
};


export const UserContext = createContext<UserContext>({
  user: {
    tenantEmail: "",
    tenantName: "",
    status: "",
    created: "",
    modified: "",
    userType: "TENANT",
    pk: "",
    sk: "",
    addresses: {}
  },
  sessionUser: null,
  setUser: () => { },
  login: () => Promise.resolve(),
  logOut: () => { },
});


export const UserContextProvider = (props: any) => {
  const sessionUser: Session["user"] | null = useSession().data?.user ?? null;
  const initialState = {
    tenantEmail: "",
    tenantName: "",
    status: "",
    userType: "TENANT" as const,

    created: "",
    modified: "",
    pk: "",
    sk: "",
    addresses: {}
  };
  const [user, setUser] = useState<UserContext["user"]>(initialState);


  useEffect(() => {
    const localUser = window.localStorage.getItem("PILLAR::USER");
    if (localUser) {
      setUser(JSON.parse(localUser));
    }
  }, []);

  /**
   * Given the user has logged in via NextAuth signIn() method...
   * This method first attempts to fetch the user from the database.
   * If there is no user found for the given email/userType combo, 
   * the user will be created in the database.
   */
  const login = async ({ email, userType, name }: { email: string; userType: "TENANT" | "PROPERTY_MANAGER" | "TECHNICIAN"; name: string; }) => {
    const body: GetOrCreateUserBody = { email, name, userType };
    const { data } = await axios.post("/api/get-or-create-user-in-db", body);
    const { response } = data;
    const parsedUser = JSON.parse(response) as UserType;
    if (parsedUser.pk) {
      window.localStorage.setItem("PILLAR::USER", JSON.stringify(parsedUser));
      setUser(parsedUser);
    }
  };

  /**
   * 1. Clear local storage - including user data.
   * 2. Sign out the user from NextAuth.
   * 3. Remove the user in state.
   */
  const logOut = () => {
    window.localStorage.clear();
    signOut();
    setUser(initialState);
  };


  return (
    <UserContext.Provider
      value={{
        user,
        sessionUser,
        setUser,
        login,
        logOut,
      }}
    >
      {props.children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
