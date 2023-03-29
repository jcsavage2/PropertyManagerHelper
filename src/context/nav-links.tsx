import { ENTITIES } from '@/database/entities';
import Link from 'next/link';
import React, { useCallback } from 'react';
import { useUserContext } from './user';

export const NavLinks = () => {
  const { user, logOut } = useUserContext();

  const handleClick = useCallback(() => {
    if (user.email) {
      return logOut();
    }
    return () => { };
  }, [user]);

  return (
    <>
      <Link className='hover:text-gray-500 text-lg' href={"/"}>Home</Link>
      {user.userType === ENTITIES.TENANT && <Link className='hover:text-gray-500 text-lg' href={"/demo"}>Demo</Link>}
      <Link onClick={handleClick} className='hover:text-gray-500 text-lg' href={"/login"}>{user.email ? "Sign Out" : "Sign In"}</Link>
      {user.userType == ENTITIES.PROPERTY_MANAGER && <Link className='hover:text-gray-500 text-lg' href={"/portal"}>Admin Portal</Link>}
    </>
  );
};