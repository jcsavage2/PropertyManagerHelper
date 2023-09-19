import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';
import { useUserContext } from '@/context/user';
import { userRoles } from '@/database/entities/user';
import { useEffect } from 'react';

const Home = () => {
  const router = useRouter();
  const { query } = router;
  const { userType, setUserType } = useUserContext();
  const { user, sessionStatus } = useSessionUser();

  //Redirect to correct page after sign in occurs
  useEffect(() => {
    if(!userType) return;
    if(userType === userRoles.TENANT) {
      router.push('/work-order-chatbot');
    }else if(userType === userRoles.TECHNICIAN) {
      router.push('/work-orders');
    } else { //PM
      router.push('/work-orders');
    }
  }, [userType])

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
  if (!user || !user?.email) {
    return <>
      <div className="text-center">
        <h1 className="mt-12 text-3xl">Welcome to Pillar</h1>
        <br />
        <button onClick={() => signIn()} className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25">
          Sign In/Sign Up
        </button>
      </div>
    </>;
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl mt-6 mb-4">Welcome to Pillar {!!user?.organizationName && `@ ${user.organizationName}`}</h1>
        <div className="mt-4 w-3/4 mx-auto">
          Hey {user?.name}, you are currently viewing Pillar as a {userType}
        </div>
        <div className="mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr', rowGap: '2em' }}>
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
      </div>
    </>
  );
};

export default Home;
