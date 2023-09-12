import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { AddTenantModal } from '@/components/add-tenant-modal';
import { PortalLeftPanel } from '@/components/portal-left-panel';
import { useDevice } from '@/hooks/use-window-size';
import { BottomNavigationPanel } from '@/components/bottom-navigation-panel';
import { ImportTenantsModal } from '@/components/import-tenants-modal';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { GetTenantsForOrgRequest } from '../api/get-all-tenants-for-org';
import { useUserContext } from '@/context/user';
import { IUser, userRoles } from '@/database/entities/user';
import { createdToFormattedDateTime, getPageLayout, toTitleCase } from '@/utils';
import { AiOutlineSearch } from 'react-icons/ai';
import ConfirmationModal from '@/components/confirmation-modal';
import { ENTITIES, StartKey } from '@/database/entities';
import { DeleteRequest } from '../api/delete';
import { toast } from 'react-toastify';
import { CiCircleRemove } from 'react-icons/ci';
import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';
import { ITenant } from '@/database/entities/tenant';
import { MdClear } from 'react-icons/md';
import { INVITE_STATUS } from '@/utils/user-types';

export type SearchTenantsBody = {
  orgId: string;
  tenantName?: string;
  tenantEmail?: string;
};

const Tenants = () => {
  const { user } = useSessionUser();
  const { userType } = useUserContext();
  const { isMobile } = useDevice();

  const [addTenantModalIsOpen, setAddTenantModalIsOpen] = useState(false);
  const [importTenantModalIsOpen, setImportTenantModalIsOpen] = useState(false);
  const [confirmDeleteModalIsOpen, setConfirmDeleteModalIsOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ pk: string; sk: string; name: string; roles: string[] }>({ pk: '', sk: '', name: '', roles: [] });
  const [tenants, setTenants] = useState<IUser[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantSearchString, setTenantSearchString] = useState<string>('');
  const [startKey, setStartKey] = useState<StartKey | undefined>(undefined);

  const fetchTenants = useCallback(
    async (isInitial: boolean, _searchString?: string) => {
      if (!user || !userType) return;
      setTenantsLoading(true);
      try {
        if (!user.email || userType !== 'PROPERTY_MANAGER' || !user.roles?.includes(userRoles.PROPERTY_MANAGER) || !user.organization) {
          throw new Error('user must be a property manager in an organization');
        }
        //Reset filter options on initial fetch
        if (isInitial && !_searchString) {
          setTenantSearchString('');
        }
        const body: GetTenantsForOrgRequest = {
          organization: user.organization,
          startKey: isInitial ? undefined : startKey,
          tenantSearchString: _searchString,
        };
        const { data } = await axios.post('/api/get-all-tenants-for-org', body);
        const response = JSON.parse(data.response);
        const _tenants: IUser[] = response.tenants;
        setStartKey(response.startKey);
        isInitial ? setTenants(_tenants) : setTenants([...tenants, ..._tenants]);
      } catch (err) {
        console.log({ err });
      }
      setTenantsLoading(false);
    },
    [user, userType, tenantSearchString, startKey]
  );

  useEffect(() => {
    fetchTenants(true);
  }, [user]);

  const handleDeleteTenant = useCallback(
    async ({ pk, sk, name, roles }: { pk: string; sk: string; name: string; roles: string[] }) => {
      setTenantsLoading(true);
      try {
        if (!pk || !sk || !name || !roles) {
          throw new Error('To delete a tenant, a pk sk name, and roles must be present');
        }
        if (!user?.roles?.includes(userRoles.PROPERTY_MANAGER)) {
          throw new Error('Only property managers can delete tenants');
        }
        const params: DeleteRequest = {
          pk: pk,
          sk: sk,
          entity: ENTITIES.USER,
          roleToDelete: ENTITIES.TENANT,
          currentUserRoles: roles,
        };
        const { data } = await axios.post('/api/delete', params);
        if (data.response) {
          toast.success('Tenant Deleted!', {
            position: toast.POSITION.TOP_CENTER,
            draggable: false,
          });
          setTenants(tenants.filter((t) => t.pk !== pk));
        }
      } catch (err) {
        console.error(err);
        toast.error('Error Deleting Tenant. Please Try Again', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
      }
      setConfirmDeleteModalIsOpen(false);
      setTenantsLoading(false);
    },
    [user, userType, tenants]
  );

  if (user && !user.organization && userType !== 'PROPERTY_MANAGER') {
    return <p>You are not authorized to use this page. You must be a property manager in an organization.</p>;
  }

  return (
    <div id="testing" className="mx-4 mt-4" style={getPageLayout(isMobile)}>
      {!isMobile && <PortalLeftPanel />}
      <ConfirmationModal
        confirmationModalIsOpen={confirmDeleteModalIsOpen}
        setConfirmationModalIsOpen={setConfirmDeleteModalIsOpen}
        onConfirm={() => handleDeleteTenant(toDelete)}
        childrenComponents={<div className="text-center">Are you sure you want to delete the tenant record for {toDelete.name}?</div>}
        onCancel={() => setToDelete({ pk: '', sk: '', name: '', roles: [] })}
      />
      <div className="lg:max-w-5xl">
        <div className={isMobile ? `w-full flex flex-col justify-center` : `flex flex-row justify-between`}>
          <h1 className="text-4xl">Tenants</h1>
          <div className={`justify-self-end ${isMobile && 'mt-2 w-full'}`}>
            <button
              className="bg-blue-200 mr-4 md:mt-0 p-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-5/12 md:w-36 text-center "
              onClick={() => {
                !tenantsLoading && setAddTenantModalIsOpen(true);
              }}
              disabled={tenantsLoading}
            >
              + Tenant
            </button>
            <button
              className="bg-blue-200 md:mt-0 p-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-5/12 md:w-36 text-center "
              onClick={() => !tenantsLoading && setImportTenantModalIsOpen(true)}
              disabled={tenantsLoading}
            >
              Import Tenants
            </button>
          </div>
        </div>
        <div className={`flex flex-row items-center justify-start h-10 text-gray-600 mt-4 ${tenantsLoading && 'opacity-50 pointer-events-none'}`}>
          <input
            type="text"
            placeholder="Search tenants..."
            className="text-black pl-3 h-full rounded pr-9 w-80 border border-blue-200"
            value={tenantSearchString}
            onChange={(e) => {
              setTenantSearchString(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tenantSearchString.length !== 0 && !tenantsLoading) {
                fetchTenants(true, tenantSearchString);
              }
            }}
          />
          <MdClear
            fontSize={28}
            className={` cursor-pointer text-red-500 hover:text-red-600 relative -left-8 ${!tenantSearchString && 'opacity-0 pointer-events-none'}}`}
            onClick={() => {
              if (tenantsLoading || !tenantSearchString) return;
              setTenantSearchString('');
              fetchTenants(true);
            }}
          />
          <div
            className="relative -left-3 cursor-pointer rounded px-3 py-1 hover:bg-blue-300 bg-blue-200"
            onClick={() => {
              if (tenantsLoading || tenantSearchString.length === 0) return;
              fetchTenants(true, tenantSearchString);
            }}
          >
            Search
          </div>
        </div>
        {isMobile ? (
          <div className={`mt-4 pb-4`}>
            <div className="flex flex-col items-center">
              {tenants.length ? (
                <p className="text-sm place-self-start font-light italic mb-1 ml-2 text-gray-500">
                  {'Showing ' + tenants.length} {tenants.length === 1 ? ' tenant...' : 'tenants...'}
                </p>
              ) : null}
              {tenants.map((tenant: IUser, index) => {
                const primaryAddress = Object.values(tenant.addresses ?? []).find((a: any) => !!a.isPrimary);
                const displayAddress = `${primaryAddress.address} ${primaryAddress.unit ? ' ' + primaryAddress.unit : ''}`;
                return (
                  <div
                    key={`${tenant.pk}-${tenant.sk}-${index}`}
                    className={`flex flex-row justify-between items-center w-full rounded-lg py-4 px-2 h-36 bg-gray-100 shadow-[0px_1px_5px_0px_rgba(0,0,0,0.3)] ${
                      index === 0 && 'mt-1'
                    } ${index < tenants.length - 1 && 'mb-3'}`}
                  >
                    <div className="pl-2 text-gray-800">
                      <p className="text-2xl ">{toTitleCase(tenant.tenantName!)} </p>
                      <p className="text-sm mt-2">{tenant.tenantEmail} </p>
                      <p className="text-sm mt-1">{toTitleCase(displayAddress)} </p>
                      <p className={` text-sm mt-2`}>{tenant.status} </p>
                    </div>
                    <CiCircleRemove
                      className="text-3xl text-red-500 cursor-pointer"
                      onClick={() => {
                        if (tenantsLoading) return;
                        setToDelete({ pk: tenant.pk, sk: tenant.sk, name: tenant.tenantName!, roles: tenant.roles });
                        setConfirmDeleteModalIsOpen(true);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`${tenantsLoading && 'opacity-50 pointer-events-none'} mb-2 mt-2`}>
            <div className="overflow-x-auto">
              {tenants && tenants.length > 0 && (
                <table className="w-full border-spacing-x-10 table-auto">
                  <thead className="">
                    <tr className="text-left text-gray-400">
                      <th className="font-normal w-52">Name</th>
                      <th className="font-normal w-64">Email</th>
                      <th className="font-normal w-20">Status</th>
                      <th className="font-normal w-72">Primary Address</th>
                      <th className="font-normal w-10">Created</th>
                      <th className=""></th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {tenants.map((tenant: any) => {
                      const primaryAddress: any = Object.values(tenant.addresses ?? []).find((a: any) => !!a.isPrimary);
                      const displayAddress = `${primaryAddress.address} ${primaryAddress.unit ? ' ' + primaryAddress.unit : ''}`;
                      return (
                        <tr key={`${tenant.pk}-${tenant.sk}`} className="h-20">
                          <td className="border-b border-t px-4 py-1">{`${toTitleCase(tenant.tenantName!)}`}</td>
                          <td className="border-b border-t px-4 py-1">{`${tenant.tenantEmail}`}</td>
                          <td className="border-b border-t px-4 py-1">{tenant.status}</td>
                          <td className="border-b border-t px-4 py-1">{toTitleCase(displayAddress)}</td>
                          <td className="border-b border-t px-4 py-1">{createdToFormattedDateTime(tenant._ct ?? tenant.created)[0]}</td>
                          <td className="pl-6 py-1">
                            <CiCircleRemove
                              className="text-3xl text-red-500 cursor-pointer"
                              onClick={() => {
                                if (tenantsLoading) return;
                                setToDelete({ pk: tenant.pk, sk: tenant.sk, name: tenant.tenantName!, roles: tenant.roles });
                                setConfirmDeleteModalIsOpen(true);
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
        {!tenantsLoading && tenants.length === 0 && <div className="font-bold text-center md:mt-6">Sorry, no tenants found.</div>}
        {tenantsLoading && (
          <div className="mt-8">
            <LoadingSpinner spinnerClass="spinner-large" />
          </div>
        )}
        {tenants.length && startKey && !tenantsLoading ? (
          <div className="w-full flex items-center justify-center">
            <button
              onClick={() => fetchTenants(false, tenantSearchString.length !== 0 ? tenantSearchString : undefined)}
              className="bg-blue-200 mx-auto py-3 px-4 w-44 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mb-24"
            >
              Load more
            </button>
          </div>
        ) : null}
      </div>
      <AddTenantModal
        tenantModalIsOpen={addTenantModalIsOpen}
        setTenantModalIsOpen={setAddTenantModalIsOpen}
        onSuccessfulAdd={() => fetchTenants(true)}
      />
      <ImportTenantsModal
        modalIsOpen={importTenantModalIsOpen}
        setModalIsOpen={setImportTenantModalIsOpen}
        onSuccessfulAdd={() => fetchTenants(true)}
      />
      {isMobile && <BottomNavigationPanel />}
    </div>
  );
};

export default Tenants;
