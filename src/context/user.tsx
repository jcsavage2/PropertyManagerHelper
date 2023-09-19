import { userRoles } from '@/database/entities/user';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { signOut } from 'next-auth/react';
import router from 'next/router';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type UserContext = {
  userType: 'TENANT' | 'PROPERTY_MANAGER' | 'TECHNICIAN' | null;
  setUserType: (type: 'TENANT' | 'PROPERTY_MANAGER' | 'TECHNICIAN') => void;
  logOut: () => void;
};

export const UserContext = createContext<UserContext>({
  userType: null,
  setUserType: () => { },
  logOut: () => { },
});

export const UserContextProvider = (props: any) => {
  const { user } = useSessionUser();
  const defaultState = user?.roles?.length === 1 ? user?.roles[0] : null;
  const [userType, setType] = useState<UserContext['userType']>(defaultState);

  useEffect(() => {
    if (userType || !user) return;
    const localUserType = localStorage.getItem('PILLAR:USER_TYPE') as UserContext['userType'] | null;

    let role: UserContext['userType'];

    if (user?.roles?.length === 1 && !localUserType) {
      role = user?.roles[0];
    } else if (localUserType && user.roles.includes(localUserType)) {
      role = localUserType as any;
    } else {
      //Select PM role if exists, otherwise pick first role
      if (user?.roles.includes(userRoles.PROPERTY_MANAGER)) {
        role = userRoles.PROPERTY_MANAGER;
      } else {
        role = user?.roles[0];
      }
    }

    setUserType(role!);
  }, [user, userType]);

  const setUserType = useCallback((type: 'TENANT' | 'PROPERTY_MANAGER' | 'TECHNICIAN') => {
    localStorage.setItem('PILLAR:USER_TYPE', type);
    setType(type);
  }, []);

  /**
   * 1. Clear local storage - including user data.
   * 2. Sign out the user from NextAuth.
   * 3. Remove the user in state.
   */
  const logOut = () => {
    localStorage.clear();
    signOut({ callbackUrl: window.location.origin });
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
