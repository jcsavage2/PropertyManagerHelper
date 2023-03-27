
import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";


export type ContextUserType = {
  type: "TENANT" | "PROPERTY_MANAGER";
  setType: Dispatch<SetStateAction<"TENANT" | "PROPERTY_MANAGER">>;
};

export const UserTypeContext = createContext<ContextUserType>({
  type: "TENANT",
  setType: () => { }
});

export const UserContextTypeProvider = (props: any) => {
  const [type, setType] = useState<ContextUserType["type"]>("TENANT");


  return (
    <UserTypeContext.Provider
      value={{
        type,
        setType
      }}
    >
      {props.children}
    </UserTypeContext.Provider>
  );
};

export const useUserTypeContext = () => useContext(UserTypeContext);