import Link from 'next/link';
import React, { useCallback } from 'react';
import { useUserContext } from './user';

export const NavLinks = () => {
  const { user, logOut, sessionUser } = useUserContext();

  const handleClick = useCallback(() => {
    if (user.pmEmail || user.tenantEmail) {
      logOut();
    }
    return () => { };
  }, [user, logOut]);

  return (
    <>
      <Link className='hover:text-gray-500 text-lg' href={"/"}>Home</Link>
      <Link onClick={handleClick} className='hover:text-gray-500 text-lg' href={"/"}>{sessionUser?.email ? "Sign Out" : "Sign In"}</Link>
      {user.pk.startsWith("T") && <Link className='hover:text-gray-500 text-lg' href={"/demo"}>Demo</Link>}
      {user.pk.startsWith("PM") && <Link className='hover:text-gray-500 text-lg' href={"/portal"}>Admin Portal</Link>}
    </>
  );
};