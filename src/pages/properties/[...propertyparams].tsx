import ConfirmationModal from '@/components/confirmation-modal';
import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';
import { PortalLeftPanel } from '@/components/portal-left-panel';
import { StateSelect } from '@/components/state-select';
import { TenantSelect } from '@/components/tenant-select';
import { DEFAULT_PROPERTY, NO_EMAIL_PREFIX, USER_PERMISSION_ERROR } from '@/constants';
import { useUserContext } from '@/context/user';
import { ENTITIES, StartKey } from '@/database/entities';
import { IEvent } from '@/database/entities/event';
import { IProperty } from '@/database/entities/property';
import { IUser } from '@/database/entities/user';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useDevice } from '@/hooks/use-window-size';
import { EditProperty, Option } from '@/types';
import { EditPropertySchema } from '@/types/customschemas';
import { createPropertyDisplayString, createdToFormattedDateTime, deconstructKey, getPageLayout, renderToastError, toTitleCase } from '@/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { CiLocationOn } from 'react-icons/ci';
import { SingleValue } from 'react-select';
import { toast } from 'react-toastify';

const PropertyPageTabs = ['edit', 'tenants', 'history'];

export default function PropertyPage() {
  const router = useRouter();
  const { propertyparams } = router.query;
  const { isMobile } = useDevice();
  const { user } = useSessionUser();
  const { userType, altName } = useUserContext();
  const [propertyLoading, setPropertyLoading] = useState(true);
  const [property, setProperty] = useState<IProperty | null>(null);

  const [events, setEvents] = useState<IEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsStartKey, setEventsStartKey] = useState<StartKey>(undefined);

  const [tenants, setTenants] = useState<IUser[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantsReassigning, setTenantsReassigning] = useState(false);
  const [tenantToAdd, setTenantToAdd] = useState<Option | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<{ name: string; email: string }>({ name: '', email: '' });
  const [tenantRemoveConfirmOpen, setTenantRemoveConfirmOpen] = useState<boolean>(false);

  const [selectedTab, setSelectedTab] = useState<string>(PropertyPageTabs[0]);

  useEffect(() => {
    if (!router.isReady) return;
    if (!propertyparams || (propertyparams && propertyparams.length === 0)) {
      setPropertyLoading(false);
      return;
    }

    const propertyId = decodeURIComponent(propertyparams[0]);
    if (propertyparams.length > 1) {
      if (PropertyPageTabs.includes(propertyparams[1])) {
        setSelectedTab(propertyparams[1]);
      } else {
        router.push(`/properties/${encodeURIComponent(propertyId)}/edit`);
      }
    } else {
      router.push(`/properties/${encodeURIComponent(propertyId)}/edit`);
    }

    async function getProperty() {
      try {
        const { data } = await axios.post('/api/get-property-by-id', {
          propertyId: propertyId,
        });
        const { property } = JSON.parse(data.response);
        setProperty(property);
      } catch (e) {
        console.log({ e });
      }
      setPropertyLoading(false);
    }
    getProperty();
  }, [router]);

  async function getPropertyEvents(_startKey?: StartKey) {
    if (!property) return;
    setIsLoadingEvents(true);
    try {
      const { data } = await axios.post('/api/get-property-events', {
        propertyId: deconstructKey(property.pk),
        startKey: _startKey,
      });
      const { events, startKey } = JSON.parse(data.response);
      setEventsStartKey(startKey);
      setEvents(events);
    } catch (e) {
      console.log({ e });
    }
    setIsLoadingEvents(false);
  }

  async function getPropertyTenants() {
    if (!property) return;
    if (!property.tenantEmails || !property.tenantEmails.length) {
      setTenants([]);
      setTenantsLoading(false);
      return;
    }
    setTenantsLoading(true);
    try {
      const { data } = await axios.post('/api/get-users', {
        emails: property.tenantEmails,
      });
      const tenants = JSON.parse(data.response);
      setTenants(tenants);
    } catch (e) {
      console.log({ e });
    }
    setTenantsLoading(false);
  }

  //Fetch correct data for selected tab
  useEffect(() => {
    if (!property) return;
    if (selectedTab === PropertyPageTabs[1]) {
      getPropertyTenants();
    } else if (selectedTab === PropertyPageTabs[2]) {
      getPropertyEvents();
    }
  }, [property, selectedTab]);

  const handleEditProperty = async (params: EditProperty) => {
    try {
      if (!user || userType !== ENTITIES.PROPERTY_MANAGER) {
        throw new Error(USER_PERMISSION_ERROR);
      }
      const { data } = await axios.post('/api/edit-property', params);
      const { property } = JSON.parse(data.response);
      setProperty(property);
      toast.success('Property updated successfully!', {
        position: toast.POSITION.TOP_CENTER,
        draggable: false,
      });
    } catch (e) {
      console.log({ e });
      renderToastError(e, 'Error updating property');
    }
  };

  const handleAddRemoveTenantToProperty = async (_tenantEmail: string | undefined, _tenantName: string | undefined, remove: boolean) => {
    if (!_tenantEmail || !_tenantName) return;
    setTenantsReassigning(true);
    try {
      if (!user || userType !== ENTITIES.PROPERTY_MANAGER) {
        throw new Error(USER_PERMISSION_ERROR);
      }
      const { data } = await axios.post('/api/add-remove-tenant-to-property', {
        propertyUUId: deconstructKey(property?.pk),
        tenantEmail: _tenantEmail,
        tenantName: _tenantName,
        pmEmail: deconstructKey(property?.GSI1PK),
        pmName: altName ?? user.name,
        remove,
      });
      const { property: _property } = JSON.parse(data.response);
      setProperty(_property);
      setTenantToDelete({ name: '', email: '' });
      toast.success(remove ? 'Tenant removed from property' : 'Tenant added to property', {
        position: toast.POSITION.TOP_CENTER,
        draggable: false,
      });
    } catch (e) {
      console.log({ e });
      renderToastError(e, remove ? 'Error removing tenant' : 'Error adding tenant');
    }
    setTenantsReassigning(false);
  };

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isValid, errors, isDirty, dirtyFields },
    control,
    reset,
  } = useForm<EditProperty>({
    resolver: zodResolver(EditPropertySchema),
    values: property
      ? {
          address: toTitleCase(property.address),
          unit: toTitleCase(property.unit),
          city: toTitleCase(property.city),
          state: property.state,
          postalCode: property.postalCode,
          propertyUUId: deconstructKey(property.pk),
          numBaths: property.numBaths,
          numBeds: property.numBeds,
          country: property.country,
          organization: property.organization,
          pmEmail: deconstructKey(property.GSI1PK),
          pmName: altName ?? user?.name ?? '',
        }
      : {
          ...DEFAULT_PROPERTY,
          organization: '',
          pmEmail: '',
          pmName: '',
        },
    mode: 'all',
  });

  return (
    <div id="property-info-page" className="md:mx-4 mx-1 md:mt-4" style={getPageLayout(isMobile)}>
      {!isMobile && <PortalLeftPanel />}
      <div className="flex flex-col lg:max-w-5xl">
        {!isMobile ? (
          <div className="text-sm breadcrumbs">
            <ul className="mb-4 ml-2">
              <li>
                <Link href="/properties">
                  <CiLocationOn className="inline mr-2 my-auto" />
                  Properties
                </Link>
              </li>
              {!propertyLoading && property ? (
                <li>
                  <a> {createPropertyDisplayString(property, false)}</a>
                </li>
              ) : null}

              {selectedTab === PropertyPageTabs[0] ? (
                <li>Edit property</li>
              ) : selectedTab === PropertyPageTabs[1] ? (
                <li>Add/remove tenants</li>
              ) : (
                <li>View property history</li>
              )}
            </ul>
            <hr />
          </div>
        ) : (
          <div className="">
            <Link href="/properties" className="mt-2 flex flex-row align-middle items-center">
              <CiLocationOn className="mr-1" fontSize={20} />
              <p className="">Return to properties</p>
            </Link>
          </div>
        )}

        {propertyLoading ? (
          <div className="flex justify-center">
            <LoadingSpinner />
          </div>
        ) : property && propertyparams ? (
          <div className="w-full justify-center flex flex-col">
            <div role="tablist" className="tabs tabs-bordered mt-2 mb-4">
              <div
                role="tab"
                className={`tab ${selectedTab === PropertyPageTabs[0] && 'tab-active'}`}
                onClick={() => router.push(`/properties/${encodeURIComponent(propertyparams[0])}/${PropertyPageTabs[0]}`)}
              >
                Edit property
              </div>
              <div
                role="tab"
                className={`tab ${selectedTab === PropertyPageTabs[1] && 'tab-active'}`}
                onClick={() => router.push(`/properties/${encodeURIComponent(propertyparams[0])}/${PropertyPageTabs[1]}`)}
              >
                Add/remove tenants
              </div>
              <div
                role="tab"
                className={`tab ${selectedTab === PropertyPageTabs[2] && 'tab-active'}`}
                onClick={() => router.push(`/properties/${encodeURIComponent(propertyparams[0])}/${PropertyPageTabs[2]}`)}
              >
                History
              </div>
            </div>
            {selectedTab === PropertyPageTabs[0] ? (
              <div className="md:w-2/3 w-full mx-auto">
                <form className="flex flex-col" onSubmit={handleSubmit(handleEditProperty)}>
                  <div className="label">
                    <span className="label-text">Address</span>
                  </div>
                  <input
                    type="text"
                    className={`input w-full h-10 ${dirtyFields.address ? 'input-warning' : 'input-bordered'}`}
                    {...register('address', {
                      required: true,
                    })}
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1 italic">{errors.address.message}</p>}

                  <div className="label">
                    <span className="label-text">Unit</span>
                  </div>
                  <input
                    type="text"
                    className={`input w-full h-10 ${dirtyFields.unit ? 'input-warning' : 'input-bordered'}`}
                    {...register('unit', {
                      required: true,
                    })}
                  />
                  {errors.unit && <p className="text-red-500 text-xs mt-1 italic">{errors.unit?.message}</p>}

                  <div className="label">
                    <span className="label-text">City</span>
                  </div>
                  <input
                    type="text"
                    className={`input w-full h-10 ${dirtyFields.city ? 'input-warning' : 'input-bordered'}`}
                    {...register('city', {
                      required: true,
                    })}
                  />
                  {errors.city && <p className="text-red-500 text-xs mt-1 italic">{errors.city.message}</p>}

                  <div className="mt-1 mb-1">
                    <Controller
                      control={control}
                      name="state"
                      render={({ field: { onChange, value } }) => <StateSelect state={value} setState={onChange} label={'State'} isDirty={dirtyFields.state} />}
                    />
                    {errors.state && <p className="text-red-500 text-xs mt-1 italic">{errors.state.message}</p>}
                  </div>

                  <div className="label">
                    <span className="label-text">Postal Code</span>
                  </div>
                  <input
                    type="text"
                    className={`input w-full h-10 ${dirtyFields.postalCode ? 'input-warning' : 'input-bordered'}`}
                    {...register('postalCode', {
                      required: true,
                    })}
                  />
                  {errors.postalCode && <p className="text-red-500 text-xs mt-1 italic">{errors.postalCode.message}</p>}

                  <div className={`flex flex-row w-full mt-4 mb-2 items-center`}>
                    <label className="text-center mr-4" htmlFor="beds">
                      Beds:{' '}
                    </label>
                    <input
                      className={`input mr-auto w-20 ${dirtyFields.numBeds ? 'input-warning' : 'input-bordered'}`}
                      type="number"
                      id="beds"
                      step={1}
                      min={1}
                      max={10}
                      {...register('numBeds')}
                    />
                    <label className="text-center ml-2 mr-4" htmlFor="baths">
                      Baths:{' '}
                    </label>
                    <input
                      className={`input mr-auto w-20 ${dirtyFields.numBaths ? 'input-warning' : 'input-bordered'}`}
                      type="number"
                      id="baths"
                      min={1}
                      max={10}
                      step={0.5}
                      {...register('numBaths')}
                    />
                  </div>
                  <input type="hidden" {...register('pmName')} value={altName ?? user?.name ?? ''} />

                  <div className="mx-auto md:w-1/2 w-full mt-4 flex flex-row justify-center">
                    <button className="btn text-black bg-blue-300 mr-3 w-3/4" type="submit" disabled={isSubmitting || !isValid || !isDirty}>
                      {isSubmitting ? <LoadingSpinner /> : 'Save Changes'}
                    </button>
                    <button
                      className="btn text-black bg bg-red-500"
                      onClick={() => {
                        reset();
                      }}
                      disabled={isSubmitting || !isDirty}
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </div>
            ) : selectedTab === PropertyPageTabs[1] ? (
              <div className="md:w-5/6 w-full mx-auto">
                <div className="mb-2 md:w-4/5 w-full h-14 flex flex-row items-center mx-auto">
                  <TenantSelect
                    label={''}
                    user={user}
                    userType={userType}
                    onChange={(e: SingleValue<Option>) => {
                      if (e) setTenantToAdd(e);
                    }}
                    shouldFetch={true}
                  />
                  <button
                    className="btn ml-2 py-0 bg-blue-200 hover:bg-blue-300"
                    onClick={() => !tenantsLoading && !tenantsReassigning && handleAddRemoveTenantToProperty(tenantToAdd?.value, tenantToAdd?.label, false)}
                    disabled={tenantsLoading || tenantsReassigning}
                  >
                    {tenantsReassigning ? <LoadingSpinner /> : 'Add tenant'}
                  </button>
                </div>

                <div className="md:w-full w-5/6 mx-auto" id="property-events">
                  {tenantsLoading ? (
                    <LoadingSpinner containerClass="mt-4" />
                  ) : tenants && tenants.length ? (
                    <table className="table mb-0">
                      <thead>
                        <tr>
                          <th></th>
                          <th>Name</th>
                          {!isMobile && <th>Email</th>}
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenants.map((user: IUser, i: number) => {
                          const numAddresses = Object.keys(user.addresses).length ?? 0;
                          const correctedEmail = user.email.startsWith(NO_EMAIL_PREFIX) ? 'No email' : user.email;
                          return (
                            <tr key={`${ENTITIES.USER}-${i}`}>
                              <th>{i + 1}</th>
                              <td>{toTitleCase(user.name)}</td>
                              {!isMobile && <td>{correctedEmail}</td>}
                              <td>
                                <div
                                  className={`${numAddresses === 1 && 'tooltip'}`}
                                  data-tip={`${numAddresses === 1 ? 'To remove this tenant, please assign them to another address first' : ''}`}
                                >
                                  <button
                                    className="btn bg-red-500 hover:bg-red-600 py-1 px-1"
                                    onClick={() => {
                                      if (tenantsReassigning) return;
                                      setTenantToDelete({ name: user.name, email: user.email });
                                      setTenantRemoveConfirmOpen(true);
                                    }}
                                    disabled={tenantsLoading || tenantsReassigning || numAddresses === 1}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="mt-4 text-center font-bold">Sorry, no tenants found for this property</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-5/6 mx-auto" id="property-events">
                {events && events.length ? (
                  events.map((event: IEvent | null, i: number) => {
                    if (event) {
                      const formattedDateTime = createdToFormattedDateTime(event.created!);
                      return (
                        <div key={`${ENTITIES.EVENT}-${i}`} className="mx-auto text-sm text-slate-800 rounded-md bg-gray-200 mt-2 mb-2 py-2 px-3 text-left">
                          <div className="mb-0.5 flex flex-row">
                            <p className="font-bold mr-2">{toTitleCase(event.madeByName)} </p>
                            <p className="text-slate-600">
                              {formattedDateTime[0]} @ {formattedDateTime[1]}
                            </p>
                          </div>
                          <div className="break-words">{event.message}</div>
                        </div>
                      );
                    }
                  })
                ) : !isLoadingEvents ? (
                  <p className="mt-4 text-center font-bold">Sorry, no property history found</p>
                ) : null}
                {isLoadingEvents ? (
                  <LoadingSpinner containerClass="mt-4" />
                ) : events && events.length && eventsStartKey && !isLoadingEvents ? (
                  <div className="w-full flex items-center justify-center">
                    <button
                      disabled={isLoadingEvents}
                      onClick={() => getPropertyEvents(eventsStartKey)}
                      className="bg-blue-200 mx-auto py-1 md:w-1/4 w-2/5 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
                    >
                      Load more
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center font-bold mt-4">Sorry, property not found</div>
        )}
        <ConfirmationModal
          confirmationModalIsOpen={tenantRemoveConfirmOpen}
          setConfirmationModalIsOpen={setTenantRemoveConfirmOpen}
          onConfirm={() => {
            handleAddRemoveTenantToProperty(tenantToDelete.email, tenantToDelete.name, true);
            setTenantToDelete({ name: '', email: '' });
            setTenantRemoveConfirmOpen(false);
          }}
          childrenComponents={<div className="text-center">Are you sure you want to remove {toTitleCase(tenantToDelete.name)} from this property?</div>}
          onCancel={() => setTenantToDelete({ name: '', email: '' })}
        />
      </div>
    </div>
  );
}
