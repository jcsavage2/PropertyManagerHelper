import axios from 'axios';
import { useSession } from 'next-auth/react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SubmitHandler, useForm } from 'react-hook-form';
import { CreateOrgSchema } from '@/types/customschemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateOrg } from '@/types';
import { renderToastSuccess } from '@/utils';

const OrgMethods = () => {
  const session = useSession();
  const sessionUser = session.data?.user ?? null;
  const sessionStatus = session.status;

  const handleCreateOrganization: SubmitHandler<CreateOrg> = async (params) => {
    await axios.post('/api/create-org', params);
    reset();
    renderToastSuccess('Organization Created!');
  };

  const {
    reset,
    handleSubmit,
    register,
    formState: { isSubmitting, isValid, errors },
  } = useForm<CreateOrg>({ resolver: zodResolver(CreateOrgSchema), mode: 'all' });

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
      <form onSubmit={handleSubmit(handleCreateOrganization)} className="w-1/2 mx-auto mt-4" style={{ display: 'grid' }}>
        <input
          className="rounded px-1 border-solid border-2 border-slate-200"
          id="orgName"
          placeholder="Organization Name"
          type={'text'}
          {...register('orgName', {
            required: true,
          })}
        />
        {errors.orgName && <p className="text-error text-xs italic">{errors.orgName.message}</p>}
        <button className="bg-blue-200 p-3 mt-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" type="submit" disabled={isSubmitting || !isValid}>
          Create Organization
        </button>
      </form>
    </div>
  );
};
export default OrgMethods;
