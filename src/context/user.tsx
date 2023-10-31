import { USER_TYPE, UserType } from '@/database/entities/user';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { signOut } from 'next-auth/react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as Fullstory from "@fullstory/browser";
import * as amplitude from '@amplitude/analytics-browser';
import { userIsPillarOwner } from '@/utils/use-user-is-not-pillar-owner';

export type UserContext = {
  userType: UserType | null;
  setUserType: (type: UserType) => void;
  altName: string | null;
  setAltName: (name: string | null) => void;
  logOut: () => void;
};

export const UserContext = createContext<UserContext>({
  userType: null,
  altName: null,
  setAltName: () => { },
  setUserType: () => { },
  logOut: () => { },
});

export const UserContextProvider = (props: any) => {
  const { user } = useSessionUser();
  const defaultState = user?.roles?.length === 1 ? user?.roles[0] : null;
  const [userType, setType] = useState<UserContext['userType']>(defaultState);
  const [altName, _setAltName] = useState<string | null>(null);
  const [hasInitialized3P, setHasInitialized3P] = useState(false);

  // Set userType and altName using session user and local storage

  useEffect(() => {
    if (user && !userIsPillarOwner(user) && !hasInitialized3P && !process.env.NEXT_PUBLIC_IS_LOCAL) {
      amplitude.init('ff368b4943b9a03a49b2c3b925e62021', {
        defaultTracking: true,
        ...(user?.email && { userId: user?.email })
      });
      Fullstory.init({ orgId: 'o-1PYDZB-na1' });
      setHasInitialized3P(true);
    }
  }, [hasInitialized3P, user]);

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
      if (user?.roles.includes(USER_TYPE.PROPERTY_MANAGER)) {
        role = USER_TYPE.PROPERTY_MANAGER;
      } else {
        role = user?.roles[0];
      }
    }
    setUserType(role!);

    if (user.altNames) {
      const localAltName = localStorage.getItem('PILLAR:ALT_NAME');
      if (localAltName) {
        if (!user.altNames.includes(localAltName)) {
          setAltName(null);
        } else {
          setAltName(localAltName);
        }
      } else {
        setAltName(null);
      }
    }
  }, [user, userType]);

  const setUserType = useCallback((type: UserType) => {
    localStorage.setItem('PILLAR:USER_TYPE', type);
    setType(type);
  }, []);

  const setAltName = useCallback((name: string | null) => {
    if (name) {
      localStorage.setItem('PILLAR:ALT_NAME', name);
      _setAltName(name);
    } else {
      localStorage.removeItem('PILLAR:ALT_NAME');
      _setAltName(null);
    }
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
        altName,
        setAltName,
        setUserType,
        logOut,
      }}
    >
      {props.children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
