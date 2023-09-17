import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { deconstructKey } from '@/utils';
import { signIn } from 'next-auth/react';

const Unauthorized = () => {
  const { user, sessionStatus } = useSessionUser();

  if (sessionStatus === 'loading') {
    return <LoadingSpinner containerClass={'mt-4'} />;
  }

  return (
    <div className="w-full text-center">
      <p className='mt-10 px-4'>You are not authorized to use this application{user?.pk ? ` as ${deconstructKey(user?.pk ?? "")}` : ""}.</p>
      <p className='mt-2 px-4'>Please sign in with same email address that was sent to from your property manager/organization.</p>
      <button
        onClick={() => signIn()}
        className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4">
        Sign In/Sign Up
      </button>
    </div>
  );
};

export default Unauthorized;
