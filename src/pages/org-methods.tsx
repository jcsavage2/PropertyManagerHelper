import { FormEventHandler, useCallback, useState } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';

const OrgMethods = () => {
  const session = useSession();
  const sessionUser = session.data?.user ?? null;
  const sessionStatus = session.status;
  const [orgName, setOrgName] = useState('');

  const handleCreateOrganization: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();
      await axios.post('/api/create-org', { name: orgName });

      setOrgName('');
    },
    [orgName]
  );

  const handleOrgNameChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setOrgName(e.currentTarget.value);
    },
    [setOrgName]
  );

  if (sessionStatus === 'loading') {
    return <LoadingSpinner containerClass={'mt-4'} />;
  }

  if (sessionStatus === 'unauthenticated') {
    return <p>You must be authenticated to view this page</p>;
  }

  if (sessionUser?.email !== 'mitchposk@gmail.com' && sessionUser?.email !== 'jcsavage@umich.edu') {
    return <p>You are not authorized to use this page</p>;
  }

  return (
    <div className="w-full text-center">
      <form onSubmit={handleCreateOrganization} className="w-1/2 mx-auto mt-4" style={{ display: 'grid' }}>
        <input
          className="rounded px-1 border-solid border-2 border-slate-200"
          id="orgName"
          placeholder="Organization Name"
          type={'text'}
          value={orgName}
          onChange={handleOrgNameChange}
        />
        <button className="bg-blue-200 p-3 mt-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" type="submit">
          Create Organization
        </button>
      </form>
    </div>
  );
};
export default OrgMethods;
