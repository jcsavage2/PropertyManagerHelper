import Link from 'next/link';
import React, { useCallback } from 'react';
import { useUserContext } from './user';
import { useRouter } from 'next/router';

export const NavLinks = () => {
  const { user, logOut, sessionUser } = useUserContext();
  const router = useRouter();

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = useCallback(() => {
    if (user.pmEmail || user.tenantEmail) {
      logOut();
      router.push("/");
    }
  }, [user, logOut, router]);

  return (
    <>
      <Link className='hover:text-gray-500 text-lg' href={"/"}>Home</Link>
      {sessionUser?.email && (<Link onClick={handleClick} className='hover:text-gray-500 text-lg' href={"/"}>{"Sign Out"}</Link>)}
      {user.pk.startsWith("T") && <Link className='hover:text-gray-500 text-lg' href={"/work-order-chatbot"}>Work Order</Link>}
      {user.pk.startsWith("PM") && <Link className='hover:text-gray-500 text-lg' href={"/work-orders"}>Admin Portal</Link>}
    </>
  );
};