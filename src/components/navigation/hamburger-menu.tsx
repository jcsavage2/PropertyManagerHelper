import { useUserContext } from '@/context/user';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { USER_TYPE } from '@/database/entities/user';

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { logOut } = useUserContext();
  const { user } = useSessionUser();
  const { userType } = useUserContext();
  const router = useRouter();

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = useCallback(() => {
    logOut();
    router.push('/');
  }, [logOut, router]);

  const linkStyle = 'hover:text-base-300 text-black my-auto text-3xl cursor-pointer mt-12';

  return (
    <>
      <div className="space-y-1 justify-self-end cursor-pointer child:w-8 child:h-1 child:block child:bg-gray-600" onClick={() => setIsOpen((s) => !s)}>
        <span></span>
        <span></span>
        <span></span>
      </div>
      {isOpen && (
        <div className="absolute top-16 left-0 bg-gray-100 text-black mt-0 w-full z-50" style={{ height: '100dvh' }} onClick={() => setIsOpen(false)}>
          <div className="flex flex-col text-primary child:mb-4">
            {user ? (
              <>
                {userType === USER_TYPE.TENANT && (
                  <Link className={linkStyle} href={'/work-order-chatbot'}>
                    New Work Order
                  </Link>
                )}
                {userType === USER_TYPE.TENANT || userType === USER_TYPE.TECHNICIAN ? (
                  <Link className={linkStyle} href={'/work-orders'}>
                    Work Orders
                  </Link>
                ) : null}
                {userType === USER_TYPE.PROPERTY_MANAGER && (
                  <Link className={linkStyle} href={'/work-orders'}>
                    Admin Portal
                  </Link>
                )}
                {user?.email && (
                  <Link onClick={handleClick} className={linkStyle} href={'/'}>
                    {'Sign Out'}
                  </Link>
                )}
                {!user?.email && (
                  <Link onClick={() => signIn()} className={linkStyle} href={'/'}>
                    {'Sign In'}
                  </Link>
                )}
              </>
            ) : null}

            <Link className={linkStyle} href={'/terms-and-conditions'}>
              {'Terms And Conditions'}
            </Link>
          </div>
        </div>
      )}
    </>
  );
};

export default HamburgerMenu;
