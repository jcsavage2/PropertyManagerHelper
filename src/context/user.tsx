import { useSessionUser } from "@/hooks/auth/use-session-user";
import { signOut } from "next-auth/react";
import { createContext, Dispatch, SetStateAction, useCallback, useContext, useEffect, useState } from "react";

export type UserContext = {
  userType: "TENANT" | "PROPERTY_MANAGER" | "TECHNICIAN" | null;
  setUserType: Dispatch<SetStateAction<"TENANT" | "PROPERTY_MANAGER" | "TECHNICIAN" | null>>;
  logOut: () => void;
};


export const UserContext = createContext<UserContext>({
  userType: null,
  setUserType: () => { },
  logOut: () => { },
});


export const UserContextProvider = (props: any) => {
  const { user } = useSessionUser();
  const defaultState = user?.roles.length === 1 ? user.roles[0] : null;
  const [userType, setUserType] = useState(defaultState);



  /**
   * 1. Clear local storage - including user data.
   * 2. Sign out the user from NextAuth.
   * 3. Remove the user in state.
   */
  const logOut = () => {
    localStorage.clear();
    signOut();
  };


  return (
    <UserContext.Provider
      value={{
        userType,
        setUserType,
        logOut,
      }}
    >
      {props.children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);

