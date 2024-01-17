import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useUserContext } from '@/context/user';
import { USER_TYPE } from '@/database/entities/user';
import { useDevice } from '@/hooks/use-window-size';

const Home = () => {
  const router = useRouter();
  const { query } = router;
  const { userType, logOut } = useUserContext();
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

  //If user is only a tenant, then redirect to chatbot, otherwise redirect to work orders
  if (user && userType) {
    if (userType === USER_TYPE.TENANT) {
      router.push('/work-order-chatbot');
    } else {
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
            <button onClick={() => router.push('/work-orders')} className="mb-4 btn btn-primary">
              View work orders
            </button>
            <button
              onClick={() => {
                logOut();
              }}
              className="btn btn-primary"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              signIn();
            }}
            className="btn btn-primary"
          >
            Sign In/Sign Up
          </button>
        )}
      </div>
    </>
  );
};

export default Home;
