import Link from 'next/link';
import Image from 'next/image';
import React, { useCallback } from 'react';
import { useUserContext } from '../context/user';
import { useRouter } from 'next/router';
import { useDevice } from '@/hooks/use-window-size';
import HamburgerMenu from './hamburger-menu';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { USER_TYPE } from '@/database/entities/user';

export const NavLinks = () => {
  const { logOut } = useUserContext();
  const { user } = useSessionUser();
  const { isMobile } = useDevice();
  const router = useRouter();
  const { userType } = useUserContext();

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = useCallback(() => {
    logOut();
    router.push('/');
  }, [logOut, router]);

  if (isMobile) {
    return (
      <nav
        style={{ height: '7dvh', width: '100vw' }}
        className="flex bg-slate-100 border-3 border-solid border-black py-3 space-x-62"
      >
        <div className={'flex text-center'} style={{ width: '100vw' }}>
          <div className="flex cursor-pointer" onClick={() => router.push('/')}>
            <p className="pl-4 text-xl my-auto font-sans">PILLAR</p>
            <Image src="/2.png" alt="1" width={30} height={0} />
          </div>
          <div className="my-auto ml-auto mr-4">
            <HamburgerMenu />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav
      style={{ height: '7dvh', width: '100vw' }}
      className="flex bg-slate-100 border-3 border-solid border-black py-3 space-x-62"
    >
      <div className={'flex space-x-5 text-center'} style={{ width: '100vw' }}>
        <div className="flex cursor-pointer" onClick={() => router.push('/')}>
          <p className="pl-4 text-xl my-auto font-sans">PILLAR</p>
          <Image src="/2.png" alt="1" width={30} height={0} />
        </div>
        <div className="my-auto flex space-x-4">
          {user ? (
            <>
              {user?.email && (
                <Link onClick={handleClick} className="hover:text-gray-500 text-lg" href={'/'}>
                  {'Sign Out'}
                </Link>
              )}
              {userType === USER_TYPE.TENANT && (
                <Link className="hover:text-gray-500 text-lg" href={'/work-order-chatbot'}>
                  New Work Order
                </Link>
              )}
              {userType === USER_TYPE.TENANT || userType === USER_TYPE.TECHNICIAN ? (
                <Link className="hover:text-gray-500 text-lg" href={'/work-orders'}>
                  Work Orders
                </Link>
              ) : null}
              {userType === USER_TYPE.PROPERTY_MANAGER && (
                <Link className="hover:text-gray-500 text-lg" href={'/work-orders'}>
                  Admin Portal
                </Link>
              )}
            </>
          ) : null}

          <Link className={'hover:text-gray-500 text-lg'} href={'/terms-and-conditions'}>
            {'Terms And Conditions'}
          </Link>
        </div>
      </div>
    </nav>
  );
};
