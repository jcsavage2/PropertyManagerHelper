import { ENTITIES } from '@/database/entities';
import Link from 'next/link';
import React, { useCallback } from 'react';
import { useUserContext } from './user';

export const NavLinks = () => {
  const { user, logOut } = useUserContext();

  const handleClick = useCallback(() => {
    if (user.pmEmail || user.tenantEmail) {
      return logOut();
    }
    return () => { };
  }, [user, logOut]);

  return (
    <>
      <Link className='hover:text-gray-500 text-lg' href={"/"}>Home</Link>
      <Link onClick={handleClick} className='hover:text-gray-500 text-lg' href={"/login"}>{user.tenantEmail || user.pmEmail ? "Sign Out" : "Sign In"}</Link>
      {user.pk.startsWith("T") && <Link className='hover:text-gray-500 text-lg' href={"/demo"}>Demo</Link>}
      {user.pk.startsWith("PM") && <Link className='hover:text-gray-500 text-lg' href={"/portal"}>Admin Portal</Link>}
    </>
  );
};