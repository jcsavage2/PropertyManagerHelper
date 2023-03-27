import { useSession } from "next-auth/react";
import { createContext, Dispatch, SetStateAction, useContext, useEffect, useState } from "react";


export type ContextUser = {
  user: {
    email: string;
    name: string;
    organization?: string | null,
    properties: string[],
    tenants: string[];
  },
  setUser: Dispatch<SetStateAction<{
    email: string;
    name: string;
    organization?: string | null | undefined;
    properties: string[];
    tenants: string[];
  }>>;
};

export const UserContext = createContext<ContextUser>({
  user: {
    email: "",
    name: "",
    organization: null,
    properties: [],
    tenants: []
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
    tenants: []
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