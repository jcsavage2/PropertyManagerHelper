import { useUserContext } from '@/context/user';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { userRoles } from '@/database/entities/user';

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

  const linkStyle = 'hover:text-gray-500 my-auto text-3xl text-white cursor-pointer mt-12';

  return (
    <>
      <div className="space-y-1 justify-self-end" onClick={() => setIsOpen((s) => !s)}>
        <span className="block w-8 h-1 bg-gray-600"></span>
        <span className="block w-8 h-1 bg-gray-600"></span>
        <span className="block w-8 h-1 bg-gray-600"></span>
      </div>
      {isOpen && (
        <div className="absolute left-0 bg-blue-400 mt-0 w-full grid z-10" style={{ top: '7dvh', height: '93dvh' }} onClick={() => setIsOpen(false)}>
          <div className="flex flex-col h-12">
            {user && (user?.roles?.includes(userRoles.PROPERTY_MANAGER) || user?.roles?.length > 1) ? (
              <Link className={linkStyle} href={'/'}>
                Home
              </Link>
            ) : null}

            {user && userType === userRoles.TENANT && (
              <Link className={linkStyle} href={'/work-order-chatbot'}>
                New Work Order
              </Link>
            )}
            {(user && userType === userRoles.TENANT) || userType === userRoles.TECHNICIAN ? (
              <Link className={linkStyle} href={'/work-orders'}>
                Work Orders
              </Link>
            ) : null}
            {user && userType === userRoles.PROPERTY_MANAGER && (
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
          </div>
        </div>
      )}
    </>
  );
};

export default HamburgerMenu;
