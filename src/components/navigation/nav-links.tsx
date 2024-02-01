import Link from 'next/link';
import Image from 'next/image';
import React, { useCallback } from 'react';
import { useUserContext } from '../../context/user';
import { useRouter } from 'next/router';
import { useDevice } from '@/hooks/use-window-size';
import HamburgerMenu from './hamburger-menu';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { USER_TYPE } from '@/database/entities/user';

const navBarStyles = 'navbar py-3 bg-base-200 sticky top-0 z-50 border-b border-neutral border-opacity-10';

export const NavLinks = () => {
  const { logOut } = useUserContext();
  const { user } = useSessionUser();
  const { isMobile } = useDevice();
  const router = useRouter();
  const { userType } = useUserContext();

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = useCallback(() => {
    logOut();
  }, [logOut, router]);

  if (isMobile) {
    return (
      <nav className={navBarStyles}>
        <div className={'flex text-center'} style={{ width: '100vw' }}>
          <div className="flex cursor-pointer" onClick={() => router.push('/')}>
            <p className="pl-4 text-xl my-auto font-sans">PILLAR</p>
            <Image src="/2.png" alt="1" width={30} height={0} />
          </div>
          <div className="my-auto ml-auto">
            <HamburgerMenu />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={navBarStyles}>
      <div className="navbar-start">
        <Link className="flex cursor-pointer mr-2 btn btn-ghost" href={'/'}>
          <p className="pl-4 text-xl my-auto font-sans">PILLAR</p>
          <Image src="/2.png" alt="1" width={30} height={0} />
        </Link>

        <div className="navbar-center text-lg child:mr-4 child-hover:text-primary-content">
          {user ? (
            <>
              {userType === USER_TYPE.TENANT && (
                <Link className="" href={'/work-order-chatbot'}>
                  New Work Order
                </Link>
              )}
              {userType === USER_TYPE.TENANT || userType === USER_TYPE.TECHNICIAN ? (
                <Link className="" href={'/work-orders'}>
                  Work Orders
                </Link>
              ) : null}
              {userType === USER_TYPE.PROPERTY_MANAGER && (
                <Link className="" href={'/work-orders'}>
                  Admin Portal
                </Link>
              )}
            </>
          ) : null}

          <Link className={''} href={'/terms-and-conditions'}>
            {'Terms And Conditions'}
          </Link>
        </div>
      </div>

      {user?.email && (
        <div className="navbar-end">
          <Link onClick={handleClick} className="" href={'/'}>
            {'Sign Out'}
          </Link>
        </div>
      )}
    </nav>
  );
};
