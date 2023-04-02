import { GetOrCreateUserBody } from "@/pages/api/get-or-create-user-in-db";
import axios from "axios";
import { signOut } from "next-auth/react";
import { createContext, Dispatch, SetStateAction, useContext, useEffect, useState } from "react";

type UserType = {
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
};
type LoginProps = { email: string; userType: "TENANT" | "PROPERTY_MANAGER"; };

export type UserContext = {
  user: UserType,
  setUser: Dispatch<SetStateAction<UserType>>;
  login: (propd: LoginProps) => void;
  logOut: () => void;
};


export const UserContext = createContext<UserContext>({
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
  login: () => { },
  logOut: () => { }
});

export const UserContextProvider = (props: any) => {
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
  const [user, setUser] = useState<UserContext["user"]>(initialState);


  /**
   * Given the user has logged in via NextAuth signIn() method...
   * This method first attempts to fetch the user from the database.
   * If there is no user found for the given email/userType combo, 
   * the user will be created in the database.
   */
  const login = ({ email, userType }: { email: string; userType: "TENANT" | "PROPERTY_MANAGER"; }) => {
    if (user.email) {
      async function getOrCreateUser() {
        const body: GetOrCreateUserBody = { email, userType };
        const { data } = await axios.post("/api/get-or-create-user-in-db", body);
        const { response } = data;
        const parsedUser = JSON.parse(response) as UserType;
        if (parsedUser.modified) {
          window.sessionStorage.setItem("PILLAR::USER", JSON.stringify(parsedUser));
          setUser(parsedUser);
        }
      }
      getOrCreateUser();
    }
  };

  /**
   * 1. Clear session storage - including user data.
   * 2. Sign out the user from NextAuth.
   * 3. Remove the user in state.
   */
  const logOut = () => {
    window.sessionStorage.clear();
    signOut();
    setUser(initialState);
  };


  return (
    <UserContext.Provider
      value={{
        user,
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
