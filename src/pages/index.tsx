import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';
import { useUserContext } from '@/context/user';
import { userRoles } from '@/database/entities/user';
import { useDevice } from '@/hooks/use-window-size';

const Home = () => {
  const router = useRouter();
  const { query } = router;
  const { userType, setUserType, logOut } = useUserContext();
  const { user, sessionStatus } = useSessionUser();
  const { isMobile } = useDevice();

  if (query?.authredirect && !user?.email && sessionStatus === 'unauthenticated') {
    const alreadyRedirected = localStorage.getItem('PILLAR::REDIRECT');
    if (!alreadyRedirected) {
      localStorage.setItem('PILLAR::REDIRECT', 'true');
      signIn('', { callbackUrl: `${window.location.origin}/` });
    } else {
      router.push('/');
    }
  }
  if (sessionStatus === 'loading') {
    return <LoadingSpinner containerClass={'mt-4'} />;
  }

  //If user is logged in and is not a PM, then route them to their respective page
  if (user && userType && !user?.roles?.includes(userRoles.PROPERTY_MANAGER)) {
    if (user?.roles.includes(userRoles.TENANT)) {
      router.push('/work-order-chatbot');
    } else if (user?.roles.includes(userRoles.TECHNICIAN)) {
      router.push('/work-orders');
    }
  }

  return (
    <>
      <div className="text-center">
        <h1 className={` ${isMobile ? 'text-xl' : 'text-2xl'} mt-6`}>Welcome to Pillar {!!user?.organizationName && `@ ${user.organizationName}`}</h1>
        <br />
        {user && user.email ? (
          <div className="flex flex-col justify-center w-full items-center">
            {user?.roles.includes(userRoles.PROPERTY_MANAGER) ? (
              <div className="w-3/4 mx-auto mb-4 ">
                Hey {user?.name}, you are currently viewing Pillar as a {userType}
              </div>
            ) : (
              <button
                onClick={() => router.push('/work-orders')}
                className="bg-blue-200 px-3 py-2 mb-4 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-44"
              >
                View work orders
              </button>
            )}
            <button
              onClick={() => {
                logOut();
              }}
              className="bg-blue-200 px-3 py-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-44"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              signIn();
            }}
            className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          >
            Sign In/Sign Up
          </button>
        )}

        {user?.roles.includes(userRoles.PROPERTY_MANAGER) ? (
          <>
            <div className="mt-8" style={{ display: 'grid', gridTemplateColumns: '1fr', rowGap: '2em' }}>
              <button
                className="justify-self-center bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-9/12 md:w-6/12"
                onClick={() => {
                  if (!user?.roles?.includes(userRoles.TENANT) || userType === userRoles.TENANT) return;
                  setUserType(userRoles.TENANT);
                  router.push('/work-order-chatbot');
                }}
                disabled={!user?.roles?.includes(userRoles.TENANT) || userType === userRoles.TENANT}
              >
                Switch to Tenant view
              </button>

              <button
                className={`justify-self-center bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-9/12 md:w-6/12`}
                onClick={async () => {
                  if (!user?.roles.includes(userRoles.PROPERTY_MANAGER) || userType === userRoles.PROPERTY_MANAGER) return;
                  setUserType(userRoles.PROPERTY_MANAGER);
                  router.push('/work-orders');
                }}
                disabled={!user?.roles?.includes(userRoles.PROPERTY_MANAGER) || userType === userRoles.PROPERTY_MANAGER}
              >
                Switch to Property Manager view
              </button>
              <button
                className="justify-self-center bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-9/12 md:w-6/12"
                onClick={async () => {
                  if (!user?.roles?.includes(userRoles.TECHNICIAN) || userType === userRoles.TECHNICIAN) return;
                  setUserType(userRoles.TECHNICIAN);
                  router.push('/work-orders');
                }}
                disabled={!user?.roles?.includes(userRoles.TECHNICIAN) || userType === userRoles.TECHNICIAN}
              >
                Switch to Technician view
              </button>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};

export default Home;
