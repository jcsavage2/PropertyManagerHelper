import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { AddTenantModal } from '@/components/modals/create-tenant';
import { useDevice } from '@/hooks/use-window-size';
import { ImportTenantsModal } from '@/components/modals/import-tenants';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { IUser, USER_TYPE } from '@/database/entities/user';
import { createdToFormattedDateTime, getTenantDisplayEmail, renderToastError, renderToastSuccess, toTitleCase } from '@/utils';
import ConfirmationModal from '@/components/modals/confirmation';
import { StartKey } from '@/database/entities';
import { CiCircleRemove } from 'react-icons/ci';
import { LoadingSpinner } from '@/components/loading-spinner';
import { AiOutlineMail } from 'react-icons/ai';
import { DEFAULT_DELETE_USER, INVITE_STATUS, USER_PERMISSION_ERROR } from '@/constants';
import { DeleteUser, DeleteUserBody, Property } from '@/types';
import { useUserContext } from '@/context/user';
import { SearchBar } from '@/components/search-bar';
import { BsCheckCircle, BsXCircle } from 'react-icons/bs';
import { MdModeEditOutline } from 'react-icons/md';
import { UpdateUserSchema } from '@/types/customschemas';
import { BulkReinviteTenantsModal } from '@/components/modals/bulk-reinvite-tenants';
import MobileCard from '@/components/mobile-card';
import CheckboxDropdown from '@/components/dropdowns/checkbox-dropdown';
import AdminPortal from '@/components/layouts/admin-portal';
import LoadMore from '@/components/load-more';

const Tenants = () => {
  const { user } = useSessionUser();
  const { userType, altName } = useUserContext();
  const { isMobile } = useDevice();

  const [confirmDeleteModalIsOpen, setConfirmDeleteModalIsOpen] = useState(false);
  const [toDelete, setToDelete] = useState<DeleteUser>(DEFAULT_DELETE_USER);
  const [tenants, setTenants] = useState<IUser[]>([]);
  const [editingTenant, setEditingTenant] = useState<IUser | null>(null);
  const [tenantNewName, setTenantNewName] = useState('');
  const [tenantsToReinvite, setTenantsToReinvite] = useState<IUser[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [resendingInvite, setResendingInvite] = useState<boolean>(false);
  const [tenantSearchString, setTenantSearchString] = useState('');
  const [startKey, setStartKey] = useState<StartKey | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<Record<'JOINED' | 'INVITED' | 'RE_INVITED', boolean>>({
    JOINED: true,
    RE_INVITED: true,
    INVITED: true,
  });

  const fetchTenants = useCallback(
    async (isInitial: boolean, _searchString?: string) => {
      if (!user || !userType) return;
      setTenantsLoading(true);
      try {
        if (!user || userType !== USER_TYPE.PROPERTY_MANAGER || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
          throw new Error(USER_PERMISSION_ERROR);
        }
        //Reset filter options on initial fetch
        if (isInitial && !_searchString) {
          setTenantSearchString('');
        }

        const { data } = await axios.post('/api/get-all-tenants-for-org', {
          organization: user.organization,
          startKey: isInitial ? undefined : startKey,
          statusFilter: statusFilter,
          tenantSearchString: _searchString,
        });
        const response = JSON.parse(data.response);
        const _tenants: IUser[] = response.tenants;

        setStartKey(response.startKey);
        isInitial ? setTenants(_tenants) : setTenants([...tenants, ..._tenants]);
        setTenantsToReinvite(_tenants.filter((t) => t.status === INVITE_STATUS.INVITED));
      } catch (err) {
        console.log({ err });
      }
      setTenantsLoading(false);
    },
    [user, userType, startKey, tenants, statusFilter]
  );

  useEffect(() => {
    fetchTenants(true, tenantSearchString);
  }, [user, statusFilter, userType]);

  const handleDeleteTenant = useCallback(
    async ({ pk, sk }: DeleteUser) => {
      setTenantsLoading(true);
      try {
        if (!user || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER) || userType !== USER_TYPE.PROPERTY_MANAGER) {
          throw new Error(USER_PERMISSION_ERROR);
        }
        const { data } = await axios.post('/api/delete/user', {
          pk: pk,
          sk: sk,
          roleToDelete: USER_TYPE.TENANT,
          madeByEmail: user.email,
          madeByName: altName ?? user.name,
        } as DeleteUserBody);
        if (data.response) {
          renderToastSuccess('Tenant Deleted!');
          setTenants(tenants.filter((t) => t.pk !== pk));
        }
      } catch (err: any) {
        console.error(err);
        renderToastError(err, 'Error Deleting Tenant');
      }
      setConfirmDeleteModalIsOpen(false);
      setTenantsLoading(false);
    },
    [user, tenants, altName, userType]
  );

  const handleEditTenantName: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setTenantNewName(event.target.value);
  };

  const handleChangeName = async () => {
    try {
      if (tenantNewName.toLowerCase() === editingTenant?.name.toLowerCase()) {
        setEditingTenant(null);
        setTenantNewName('');
        return;
      }
      if (!editingTenant) {
        throw new Error('You Must be editing a Tenant');
      }
      const params = UpdateUserSchema.parse({
        pk: editingTenant.pk,
        sk: editingTenant.sk,
        name: tenantNewName.toLowerCase(),
      });
      await axios.post('/api/update-user', params);
      renderToastSuccess("Successfully updated user's name!");
      setEditingTenant(null);
      setTenantNewName('');
      fetchTenants(false, tenantSearchString);
    } catch (error) {
      console.log({ error });
      renderToastError(error, "Error Updatng User's Name");
    }
  };

  const handleReinviteTenant = async ({ name, email }: { name: string; email: string }) => {
    setResendingInvite(true);
    try {
      if (!user || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER) || userType !== USER_TYPE.PROPERTY_MANAGER) {
        throw new Error(USER_PERMISSION_ERROR);
      }
      const { data } = await axios.post('/api/reinvite-tenants', {
        pmName: altName ?? user.name,
        tenants: [{ name, email }],
        organizationName: user.organizationName,
      });

      renderToastSuccess(`Re-invitation successfully sent to ${toTitleCase(name)}`);
      fetchTenants(false, tenantSearchString);
    } catch (err) {
      console.error(err);
      renderToastError(err, 'Error sending reinvite email');
    }
    setResendingInvite(false);
  };

  if (user && !user.organization && userType !== USER_TYPE.PROPERTY_MANAGER) {
    return <p>You are not authorized to use this page. You must be a property manager in an organization.</p>;
  }
  return (
    <AdminPortal id="tenants" isLoading={!user || !userType}>
      <ConfirmationModal
        id="confirm-tenant-delete"
        confirmationModalIsOpen={confirmDeleteModalIsOpen}
        setConfirmationModalIsOpen={setConfirmDeleteModalIsOpen}
        onConfirm={() => handleDeleteTenant(toDelete)}
        childrenComponents={<div className="text-center">Are you sure you want to delete the tenant record for {toTitleCase(toDelete.name)}?</div>}
        onCancel={() => setToDelete(DEFAULT_DELETE_USER)}
      />
      <div className={isMobile ? `w-full flex flex-col justify-center` : `flex flex-row justify-between`}>
        <h1 className="text-4xl">Tenants</h1>
        <div className={`justify-self-end ${isMobile && 'mt-2 w-full'}`}>
          <AddTenantModal onSuccessfulAdd={() => fetchTenants(true, tenantSearchString)} />
          <ImportTenantsModal onSuccessfulAdd={() => fetchTenants(true, tenantSearchString)} />
        </div>
      </div>
      <SearchBar
        placeholder="Search tenants..."
        searchString={tenantSearchString}
        setSearchString={setTenantSearchString}
        resultsLoading={tenantsLoading}
        onSearch={() => {
          if (tenantSearchString.length !== 0 && !tenantsLoading) {
            fetchTenants(true, tenantSearchString);
          }
        }}
        onClear={() => {
          if (tenantsLoading || !tenantSearchString) return;
          setTenantSearchString('');
          fetchTenants(true);
        }}
      />
      <div className={`flex flex-row justify-between w-full items-center`}>
        <div className={`${tenantsLoading && 'pointer-events-none opacity-20'}`}>
          <CheckboxDropdown
            dropdownLabel="Status"
            options={[
              { label: 'Invited', value: INVITE_STATUS.INVITED },
              { label: 'Joined', value: INVITE_STATUS.JOINED },
              { label: 'Re-Invited', value: INVITE_STATUS.RE_INVITED },
            ]}
            selectedOptions={statusFilter}
            setSelectedOptions={setStatusFilter}
          />
        </div>

        {!isMobile && tenants && tenantsToReinvite && tenantsToReinvite.length > 0 ? <BulkReinviteTenantsModal /> : null}
      </div>
      {isMobile ? (
        <div>
          <div className={`mt-2 pb-4 min-h-fit`}>
            <div className="flex flex-col items-center">
              {tenants.length ? (
                <p className="text-sm place-self-start font-light italic mb-1 ml-2">
                  {'Showing ' + tenants.length} {tenants.length === 1 ? ' tenant...' : 'tenants...'}
                </p>
              ) : null}
              {tenants.map((tenant: IUser, index) => {
                const primaryAddress = Object.values(tenant.addresses ?? []).find((a: any) => !!a.isPrimary);
                const displayAddress = `${primaryAddress.address} ${primaryAddress.unit ? ' ' + primaryAddress.unit : ''}`;
                const correctedEmail = getTenantDisplayEmail(tenant.email);

                return (
                  <MobileCard title={toTitleCase(tenant.name)} key={`list-${tenant.pk}-${tenant.sk}-${index}`}>
                    <div className="flex flex-row justify-between items-center">
                      <div className="text-sm">
                        <p className="">{correctedEmail} </p>
                        <p className="mt-1">{toTitleCase(displayAddress)} </p>
                        <div className={`mt-2 flex flex-row`}>
                          <div className={`${tenant.status === INVITE_STATUS.JOINED ? 'text-green-600' : 'text-yellow-500'} my-auto h-max inline-block`}>{tenant.status}</div>{' '}
                          {tenant.status === INVITE_STATUS.INVITED || tenant.status === INVITE_STATUS.RE_INVITED ? (
                            <button
                              className="ml-2 btn btn-sm btn-secondary"
                              onClick={() => {
                                if (resendingInvite) return;
                                handleReinviteTenant({ email: tenant.email, name: tenant.name });
                              }}
                              disabled={resendingInvite}
                            >
                              <AiOutlineMail />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <CiCircleRemove
                        className="text-3xl text-error cursor-pointer -mt-8"
                        onClick={() => {
                          if (tenantsLoading) return;
                          setToDelete({
                            pk: tenant.pk,
                            sk: tenant.sk,
                            name: tenant.name,
                          });
                          setConfirmDeleteModalIsOpen(true);
                        }}
                      />
                    </div>
                  </MobileCard>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className={`${tenantsLoading && 'opacity-50 pointer-events-none'} mb-2 mt-2`}>
          <div className="overflow-x-auto">
            {tenants && tenants.length > 0 && (
              <table className="table table-zebra">
                <thead className="">
                  <tr className="">
                    <th className="">Name</th>
                    <th className="">Email</th>
                    <th className="">Status</th>
                    <th className="hidden lg:table-cell">Primary Address</th>
                    <th className="hidden lg:table-cell">Created</th>
                    <th className=""></th>
                  </tr>
                </thead>
                <tbody className="">
                  {tenants.map((tenant: IUser) => {
                    const primaryAddress: Property = Object.values(tenant.addresses ?? []).find((a: any) => !!a.isPrimary);
                    const displayAddress = `${primaryAddress.address} ${primaryAddress.unit ? ' ' + primaryAddress.unit.toUpperCase() : ''}`;

                    const correctedEmail = getTenantDisplayEmail(tenant.email);

                    return (
                      <tr key={`altlist-${tenant.pk}-${tenant.sk}`} className="h-16">
                        <td className="">
                          {editingTenant?.email === tenant.email ? (
                            <div className="flex flex-row align-middle">
                              <input
                                onChange={handleEditTenantName}
                                autoFocus
                                className="rounded input input-bordered input-sm"
                                id="name"
                                value={toTitleCase(tenantNewName)}
                                type={'text'}
                              />
                              <button
                                className="ml-2"
                                onClick={() => {
                                  handleChangeName();
                                }}
                              >
                                <BsCheckCircle className="text-success" fontSize={18} />
                              </button>
                              <button
                                className="ml-1"
                                onClick={() => {
                                  setEditingTenant(null);
                                  setTenantNewName('');
                                }}
                              >
                                <BsXCircle className="text-error" fontSize={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-row align-middle">
                              {`${toTitleCase(tenant.name)}`}{' '}
                              <button
                                className="ml-2"
                                onClick={() => {
                                  setEditingTenant(tenant);
                                  setTenantNewName(tenant.name);
                                }}
                              >
                                <MdModeEditOutline fontSize={16} className="text-accent" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="">{`${correctedEmail}`}</td>
                        <td className="">
                          <div className="flex flex-row items-center justify-start">
                            <div className={`${tenant.status === INVITE_STATUS.JOINED ? 'text-success' : 'text-warning'} my-auto h-max inline-block`}>{tenant.status}</div>{' '}
                            {tenant.status === INVITE_STATUS.INVITED || tenant.status === INVITE_STATUS.RE_INVITED ? (
                              <button
                                className="btn btn-secondary btn-sm ml-2"
                                onClick={() => {
                                  if (resendingInvite) return;
                                  handleReinviteTenant({ email: tenant.email, name: tenant.name });
                                }}
                                disabled={resendingInvite}
                              >
                                <AiOutlineMail />
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className="hidden lg:table-cell">{toTitleCase(displayAddress)}</td>
                        <td className="hidden lg:table-cell">{createdToFormattedDateTime(tenant.created)[0]}</td>
                        <td className="">
                          <CiCircleRemove
                            className="text-3xl text-error cursor-pointer"
                            onClick={() => {
                              if (tenantsLoading) return;
                              setToDelete({
                                pk: tenant.pk,
                                sk: tenant.sk,
                                name: tenant.name,
                              });
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
      {tenantsLoading ? (
        <div className="mt-1">
          <LoadingSpinner containerClass="h-20" spinnerClass="spinner-large" />
        </div>
      ) : (
        <div className="w-full flex items-center justify-center">
          <LoadMore
            isDisabled={tenantsLoading}
            isVisible={tenants && tenants.length && startKey && !tenantsLoading}
            onClick={() => fetchTenants(false, tenantSearchString.length !== 0 ? tenantSearchString : undefined)}
          />
        </div>
      )}
    </AdminPortal>
  );
};

export default Tenants;
