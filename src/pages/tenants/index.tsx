import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { AddTenantModal } from '@/components/add-tenant-modal';
import { PortalLeftPanel } from '@/components/portal-left-panel';
import { useDevice } from '@/hooks/use-window-size';
import { BottomNavigationPanel } from '@/components/bottom-navigation-panel';
import { ImportTenantsModal } from '@/components/import-tenants-modal';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { IUser, USER_TYPE } from '@/database/entities/user';
import { createdToFormattedDateTime, getPageLayout, renderToastError, toTitleCase } from '@/utils';
import ConfirmationModal from '@/components/confirmation-modal';
import { ENTITIES, StartKey } from '@/database/entities';
import { toast } from 'react-toastify';
import { CiCircleRemove } from 'react-icons/ci';
import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';
import { BiCheckbox, BiCheckboxChecked } from 'react-icons/bi';
import { AiOutlineMail } from 'react-icons/ai';
import { DEFAULT_DELETE_USER, INVITE_STATUS, NO_EMAIL_PREFIX, USER_PERMISSION_ERROR } from '@/constants';
import { DeleteEntity, DeleteUser, Property } from '@/types';
import { useUserContext } from '@/context/user';
import { DeleteEntitySchema, UpdateUserSchema } from '@/types/customschemas';
import { MdModeEditOutline, MdClear } from 'react-icons/md';
import { BsCheckCircle, BsXCircle } from 'react-icons/bs';

export type SearchTenantsBody = {
  orgId: string;
  tenantName?: string;
  tenantEmail?: string;
};

const Tenants = () => {
  const { user } = useSessionUser();
  const { userType, altName } = useUserContext();
  const { isMobile } = useDevice();

  const [addTenantModalIsOpen, setAddTenantModalIsOpen] = useState(false);
  const [importTenantModalIsOpen, setImportTenantModalIsOpen] = useState(false);
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
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [confirmReinviteTenantsModalIsOpen, setConfirmReinviteTenantsModalIsOpen] = useState(false);

  const fetchTenants = useCallback(
    async (isInitial: boolean, _searchString?: string, fetchAllTenants?: boolean) => {
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
          fetchAllTenants,
        });
        const response = JSON.parse(data.response);
        const _tenants: IUser[] = response.tenants;

        setStartKey(response.startKey);
        isInitial || fetchAllTenants ? setTenants(_tenants) : setTenants([...tenants, ..._tenants]);
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
    async ({ pk, sk, roles }: DeleteUser) => {
      setTenantsLoading(true);
      try {
        if (!user || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER) || userType !== USER_TYPE.PROPERTY_MANAGER) {
          throw new Error(USER_PERMISSION_ERROR);
        }
        const params: DeleteEntity = DeleteEntitySchema.parse({
          pk: pk,
          sk: sk,
          entity: ENTITIES.USER,
          roleToDelete: ENTITIES.TENANT,
          currentUserRoles: roles,
          madeByEmail: user.email,
          madeByName: altName ?? user.name,
        });
        const { data } = await axios.post('/api/delete', params);
        if (data.response) {
          toast.success('Tenant Deleted!', {
            position: toast.POSITION.TOP_CENTER,
            draggable: false,
          });
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

  const handleReinviteTenants = useCallback(
    async ({ _tenants }: { _tenants: { name: string; email: string }[] }) => {
      setResendingInvite(true);
      try {
        if (!user || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER) || userType !== USER_TYPE.PROPERTY_MANAGER) {
          throw new Error(USER_PERMISSION_ERROR);
        }
        if (!_tenants) {
          throw new Error('Missing required params for reinvite tenants');
        }

        const batchedTenants = _tenants.reduce(
          (batches, tenant, i) => {
            const batchNumber = Math.floor(i / 5);
            if (!batches[batchNumber]) {
              batches[batchNumber] = [];
            }
            batches[batchNumber].push(tenant);
            return batches;
          },
          {} as Record<number, { name: string; email: string }[]>
        );

        const batchedRequests = Object.values(batchedTenants).map((tenants) => {
          return axios.post('/api/reinvite-tenants', {
            pmName: altName ?? user.name,
            tenants,
            organizationName: user.organizationName,
          });
        });

        const allResponses = await Promise.all(batchedRequests);
        const successfulResponses = allResponses.map((r) => r.status === 200);

        if (successfulResponses.length === allResponses.length) {
          toast.success(`${allResponses.length === 1 ? 'Re-invitation' : 'All Re-invitations'} successfully sent`, {
            position: toast.POSITION.TOP_CENTER,
            draggable: false,
          });
        }
        if (successfulResponses.length !== allResponses.length && successfulResponses.length > 0) {
          toast.error('Some Re-invitations successfully sent, please refresh page and retry', {
            position: toast.POSITION.TOP_CENTER,
            draggable: false,
          });
        }
        if (!successfulResponses.length) {
          toast.error('No re-invitations were successfully sent - please contact Pillar for this bug.', {
            position: toast.POSITION.TOP_CENTER,
            draggable: false,
          });
        }

        fetchTenants(false, undefined, true);
        setTenantSearchString('');
      } catch (err) {
        console.error(err);
        toast.error('Error sending reinvite email(s)', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
      }
      setTenantsToReinvite(tenants.filter((t) => t.status === INVITE_STATUS.INVITED));
      setResendingInvite(false);
    },
    [user, altName, tenants]
  );

  const handleEditTenantName: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setTenantNewName(event.target.value);
  };

  const handleChangeName = async () => {
    try {
      if (!editingTenant) {
        throw new Error('You Must be editing a Tenant');
      }
      const params = UpdateUserSchema.parse({
        pk: editingTenant.pk,
        sk: editingTenant.sk,
        name: tenantNewName.toLowerCase(),
      });
      await axios.post('/api/update-user', params);
      toast.success("Successfully updated user's name!", { position: toast.POSITION.TOP_CENTER, draggable: false });
      setEditingTenant(null);
      setTenantNewName('');
      fetchTenants(false, tenantSearchString, true);
    } catch (error) {
      console.log(error);
      toast.error((error as any) ?? "Error updating user's name", { position: toast.POSITION.TOP_CENTER, draggable: false });
    }
  };

  if (user && !user.organization && userType !== USER_TYPE.PROPERTY_MANAGER) {
    return <p>You are not authorized to use this page. You must be a property manager in an organization.</p>;
  }
  return (
    <div id="tenants" className="mx-4 mt-4" style={getPageLayout(isMobile)}>
      {!isMobile && <PortalLeftPanel />}
      <ConfirmationModal
        confirmationModalIsOpen={confirmDeleteModalIsOpen}
        setConfirmationModalIsOpen={setConfirmDeleteModalIsOpen}
        onConfirm={() => handleDeleteTenant(toDelete)}
        childrenComponents={<div className="text-center">Are you sure you want to delete the tenant record for {toTitleCase(toDelete.name)}?</div>}
        onCancel={() => setToDelete(DEFAULT_DELETE_USER)}
      />

      <ConfirmationModal
        confirmationModalIsOpen={confirmReinviteTenantsModalIsOpen}
        setConfirmationModalIsOpen={setConfirmReinviteTenantsModalIsOpen}
        fetchAllTenants={() => fetchTenants(false, undefined, true)}
        onConfirm={() => {
          if (resendingInvite) return;
          if (tenantsToReinvite && tenantsToReinvite.length > 0) {
            handleReinviteTenants({
              _tenants: tenantsToReinvite.map((t) => ({ name: t.name, email: t.email })),
            });
          }
          setConfirmReinviteTenantsModalIsOpen(false);
        }}
        onCancel={() => {
          setTenantsToReinvite(tenants.filter((t) => t.status === INVITE_STATUS.INVITED));
        }}
        buttonsDisabled={resendingInvite}
        childrenComponents={
          <div className="flex flex-col text-center items-center justify-center mt-2">
            <div>{"Are you sure? This will resend an invitation email to ALL tenants whose status is 'Invited'."}</div>
            <div className="italic mt-2 mb-2">This action will email all {tenantsToReinvite.length} of the tenants in this list.</div>
            <div className="overflow-y-scroll max-h-96 h-96 w-full px-4 py-2 border rounded border-gray-300">
              {tenantsToReinvite && tenantsToReinvite.length ? (
                tenantsToReinvite.map((tenant: IUser, i) => {
                  const correctedEmail = tenant.email?.startsWith(NO_EMAIL_PREFIX) ? 'None' : tenant.email;
                  return (
                    <div
                      key={'reinvitelist' + tenant.name + tenant.email + i}
                      className="bg-blue-100 text-gray-600 rounded px-4 py-1 w-full flex flex-row items-center justify-center last:mb-0 mb-3"
                    >
                      <div className="flex flex-col overflow-hidden w-11/12">
                        <p>{toTitleCase(tenant.name)}</p> <p>{correctedEmail}</p>
                      </div>
                      <MdClear
                        className={`h-6 w-6 cursor-pointer ${resendingInvite && 'opacity-50 pointer-events-none'}`}
                        color="red"
                        onClick={() => {
                          if (resendingInvite) return;
                          setTenantsToReinvite(tenantsToReinvite.filter((t) => t.email !== tenant.email));
                        }}
                      />
                    </div>
                  );
                })
              ) : (
                <div>No tenants to reinvite</div>
              )}
            </div>
          </div>
        }
      />
      <div className="lg:max-w-7xl">
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
        <div className={`flex flex-row items-center justify-start h-10 text-gray-600 mt-4 mb-2 ${tenantsLoading && 'opacity-50 pointer-events-none'}`}>
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
              if (tenantsLoading || !tenantSearchString) return;
              fetchTenants(true, tenantSearchString);
            }}
          >
            Search
          </div>
        </div>
        <div className={`flex flex-row justify-between w-full items-center text-gray-600 ${tenantsLoading && 'pointer-events-none'}`}>
          <div>
            <button
              className={`${tenantsLoading && 'opacity-50'} h-full mr-2 px-3 py-2 rounded ${!statusFilter.JOINED || !statusFilter.INVITED ? 'bg-blue-200' : 'bg-gray-200'}`}
              onClick={() => setShowStatusFilter((s) => !s)}
            >
              Status
            </button>
            {showStatusFilter && (
              <div className="absolute opacity-100 z-10 rounded bg-white p-5 mt-1 w-52 shadow-[0px_10px_20px_2px_rgba(0,0,0,0.3)] grid grid-cols-1 gap-y-4">
                <div
                  className={`flex ${statusFilter.INVITED ? 'hover:bg-blue-200' : 'hover:bg-gray-200'}`}
                  onClick={() => {
                    if (tenantsLoading) return;
                    setStatusFilter({ ...statusFilter, INVITED: !statusFilter.INVITED });
                  }}
                >
                  <p className={`py-1 px-3 cursor-pointer flex w-full rounded`}>Invited</p>
                  {!statusFilter.INVITED ? (
                    <BiCheckbox className="mr-3 justify-self-end my-auto flex-end" size={'1.5em'} />
                  ) : (
                    <BiCheckboxChecked className="mr-3 justify-self-end my-auto flex-end" size={'1.5em'} />
                  )}
                </div>

                <div
                  className={`flex ${statusFilter.JOINED ? 'hover:bg-blue-200' : 'hover:bg-gray-200'}`}
                  onClick={() => {
                    if (tenantsLoading) return;
                    setStatusFilter({ ...statusFilter, JOINED: !statusFilter.JOINED });
                  }}
                >
                  <p className={`py-1 px-3 cursor-pointer flex w-full rounded ${statusFilter.JOINED ? 'hover:bg-blue-200' : 'hover:bg-gray-200'}`}>Joined</p>
                  {!statusFilter.JOINED ? (
                    <BiCheckbox className="mr-3 justify-self-end my-auto flex-end" size={'1.5em'} />
                  ) : (
                    <BiCheckboxChecked className="mr-3 justify-self-end my-auto flex-end" size={'1.5em'} />
                  )}
                </div>
                <div
                  className={`flex ${statusFilter.RE_INVITED ? 'hover:bg-blue-200' : 'hover:bg-gray-200'}`}
                  onClick={() => {
                    if (tenantsLoading) return;
                    setStatusFilter({ ...statusFilter, RE_INVITED: !statusFilter.RE_INVITED });
                  }}
                >
                  <p className={`py-1 px-3 cursor-pointer flex w-full rounded ${statusFilter.RE_INVITED ? 'hover:bg-blue-200' : 'hover:bg-gray-200'}`}>Re-Invited</p>
                  {!statusFilter.RE_INVITED ? (
                    <BiCheckbox className="mr-3 justify-self-end my-auto flex-end" size={'1.5em'} />
                  ) : (
                    <BiCheckboxChecked className="mr-3 justify-self-end my-auto flex-end" size={'1.5em'} />
                  )}
                </div>
              </div>
            )}
          </div>
          {!isMobile && tenants && tenantsToReinvite && tenantsToReinvite.length > 0 ? (
            <button
              className={`cursor-pointer  rounded px-4 py-2 mr-4 hover:bg-blue-300 bg-blue-200 ${tenantsLoading && 'opacity-50 pointer-events-none'}}`}
              onClick={() => !tenantsLoading && setConfirmReinviteTenantsModalIsOpen(true)}
            >
              Bulk Re-Invite
            </button>
          ) : null}
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

                const correctedEmail = tenant.email?.startsWith(NO_EMAIL_PREFIX) ? 'No Email' : tenant.email;
                return (
                  <div
                    key={`list-${tenant.pk}-${tenant.sk}-${index}`}
                    className={`flex flex-row justify-between items-center w-full rounded-lg py-4 px-2 h-36 bg-gray-100 shadow-[0px_1px_5px_0px_rgba(0,0,0,0.3)] ${
                      index === 0 && 'mt-1'
                    } ${index < tenants.length - 1 && 'mb-3'}`}
                  >
                    <div className="pl-2 text-gray-800">
                      <p className="text-2xl ">{toTitleCase(tenant.name)}</p>
                      <p className="text-sm mt-2">{correctedEmail} </p>
                      <p className="text-sm mt-1">{toTitleCase(displayAddress)} </p>
                      <div className={`text-sm mt-2 flex flex-row`}>
                        <div className={`${tenant.status === INVITE_STATUS.JOINED ? 'text-green-600' : 'text-yellow-500'} my-auto h-max inline-block`}>{tenant.status}</div>{' '}
                        {tenant.status === INVITE_STATUS.INVITED || tenant.status === INVITE_STATUS.RE_INVITED ? (
                          <button
                            className="cursor-pointer w-8 h-8 hover:bg-blue-100 bg-blue-200 rounded px-2 py-2 ml-2 disabled:opacity-50"
                            onClick={() => {
                              if (resendingInvite) return;
                              handleReinviteTenants({
                                _tenants: [{ email: tenant.email, name: tenant.name }],
                              });
                            }}
                            disabled={resendingInvite}
                          >
                            <AiOutlineMail />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <CiCircleRemove
                      className="text-3xl text-red-500 cursor-pointer"
                      onClick={() => {
                        if (tenantsLoading) return;
                        setToDelete({
                          pk: tenant.pk,
                          sk: tenant.sk,
                          name: tenant.name,
                          roles: tenant.roles,
                        });
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
                <table className="w-full border-spacing-x-4 table table-lg">
                  <thead className="">
                    <tr className="text-left text-gray-400">
                      <th className="font-normal">Name</th>
                      <th className="font-normal">Email</th>
                      <th className="font-normal">Status</th>
                      <th className="font-normal">Primary Address</th>
                      <th className="font-normal">Created</th>
                      <th className=""></th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {tenants.map((tenant: IUser) => {
                      const primaryAddress: Property = Object.values(tenant.addresses ?? []).find((a: any) => !!a.isPrimary);
                      const displayAddress = `${primaryAddress.address} ${primaryAddress.unit ? ' ' + primaryAddress.unit.toUpperCase() : ''}`;

                      const correctedEmail = tenant.email?.startsWith(NO_EMAIL_PREFIX) ? 'None' : tenant.email;
                      return (
                        <tr key={`altlist-${tenant.pk}-${tenant.sk}`} className="h-20">
                          <td className="border-b border-t px-2 py-1">
                            {editingTenant?.email === tenant.email ? (
                              <>
                                <input
                                  onChange={handleEditTenantName}
                                  autoFocus
                                  className="rounded px-1 border-solid border-2 border-slate-200 mt-5"
                                  id="name"
                                  value={toTitleCase(tenantNewName)}
                                  type={'text'}
                                />
                                <button
                                  className="ml-1"
                                  onClick={() => {
                                    handleChangeName();
                                  }}
                                >
                                  <BsCheckCircle />
                                </button>
                                <button
                                  className="ml-1"
                                  onClick={() => {
                                    setEditingTenant(null);
                                    setTenantNewName('');
                                  }}
                                >
                                  <BsXCircle />
                                </button>
                              </>
                            ) : (
                              <>
                                {`${toTitleCase(tenant.name)}`}{' '}
                                <button
                                  onClick={() => {
                                    setEditingTenant(tenant);
                                    setTenantNewName(tenant.name);
                                  }}
                                >
                                  <MdModeEditOutline />
                                </button>
                              </>
                            )}
                          </td>
                          <td className="border-b border-t px-2 py-1">{`${correctedEmail}`}</td>
                          <td className="border-b border-t">
                            <div className="flex flex-row items-center justify-start">
                              <div className={`${tenant.status === INVITE_STATUS.JOINED ? 'text-green-600' : 'text-yellow-500'} my-auto h-max inline-block`}>
                                {tenant.status}
                              </div>{' '}
                              {tenant.status === INVITE_STATUS.INVITED || tenant.status === INVITE_STATUS.RE_INVITED ? (
                                <button
                                  className="cursor-pointer w-8 h-8 hover:bg-blue-100 bg-blue-200 rounded px-2 py-2 ml-2 disabled:opacity-50"
                                  onClick={() => {
                                    if (resendingInvite) return;
                                    handleReinviteTenants({
                                      _tenants: [{ email: tenant.email, name: tenant.name }],
                                    });
                                  }}
                                  disabled={resendingInvite}
                                >
                                  <AiOutlineMail />
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td className="border-b border-t px-2 py-1">{toTitleCase(displayAddress)}</td>
                          <td className="border-b border-t px-1 py-1">{createdToFormattedDateTime(tenant.created)[0]}</td>
                          <td className="pl-6 py-1">
                            <CiCircleRemove
                              className="text-3xl text-red-500 cursor-pointer"
                              onClick={() => {
                                if (tenantsLoading) return;
                                setToDelete({
                                  pk: tenant.pk,
                                  sk: tenant.sk,
                                  name: tenant.name,
                                  roles: tenant.roles,
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
        {tenantsLoading && (
          <div className="mt-4">
            <LoadingSpinner containerClass="h-20" spinnerClass="spinner-large" />
          </div>
        )}
        {tenants.length && startKey && !tenantsLoading ? (
          <div className="w-full flex items-center justify-center mb-32">
            <button
              onClick={() => fetchTenants(false, tenantSearchString.length !== 0 ? tenantSearchString : undefined)}
              className="bg-blue-200 mx-auto py-3 px-4 w-44 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mb-24"
            >
              Load more
            </button>
          </div>
        ) : (
          <div className="mb-32"></div>
        )}
      </div>
      <AddTenantModal tenantModalIsOpen={addTenantModalIsOpen} setTenantModalIsOpen={setAddTenantModalIsOpen} onSuccessfulAdd={() => fetchTenants(true, tenantSearchString)} />
      <ImportTenantsModal modalIsOpen={importTenantModalIsOpen} setModalIsOpen={setImportTenantModalIsOpen} onSuccessfulAdd={() => fetchTenants(true, tenantSearchString)} />
      {isMobile && <BottomNavigationPanel />}
    </div>
  );
};

export default Tenants;
