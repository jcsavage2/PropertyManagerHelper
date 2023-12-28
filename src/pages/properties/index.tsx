import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { PortalLeftPanel } from '@/components/portal-left-panel';
import { useDevice } from '@/hooks/use-window-size';
import { BottomNavigationPanel } from '@/components/bottom-navigation-panel';
import { AddPropertyModal } from '@/components/add-property-modal';
import React from 'react';
import { IProperty } from '@/database/entities/property';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { deconstructKey, getPageLayout, setToShortenedString, toTitleCase } from '@/utils';
import { StartKey } from '@/database/entities';
import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';
import { FaEdit } from 'react-icons/fa';
import Link from 'next/link';
import { MdClear } from 'react-icons/md';
import { useUserContext } from '@/context/user';
import { USER_TYPE } from '@/database/entities/user';
import { USER_PERMISSION_ERROR } from '@/constants';
import { useRouter } from 'next/router';
import { SearchBar } from '@/components/search-bar';

const Properties = () => {
  const router = useRouter();
  const { user } = useSessionUser();
  const [addPropertyModalIsOpen, setAddPropertyModalIsOpen] = useState(false);
  const [properties, setProperties] = useState<IProperty[]>([]);
  const { isMobile } = useDevice();
  const { userType } = useUserContext();
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [startKey, setStartKey] = useState<StartKey>(undefined);
  const [propertySearchString, setPropertySearchString] = useState('');

  const fetchProperties = useCallback(
    async (isInitial: boolean, _searchString?: string) => {
      setPropertiesLoading(true);
      try {
        if (!user || userType !== USER_TYPE.PROPERTY_MANAGER || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
          throw new Error(USER_PERMISSION_ERROR);
        }

        //Reset filter options on initial fetch
        if (isInitial && !_searchString) {
          setPropertySearchString('');
        }

        const { data } = await axios.post('/api/get-all-properties', {
          organization: user?.organization,
          startKey: isInitial ? undefined : startKey,
          propertySearchString: _searchString,
        });
        const response = JSON.parse(data.response);
        const _properties = (response.properties ?? []) as IProperty[];
        isInitial ? setProperties(_properties) : setProperties([...properties, ..._properties]);
        setStartKey(response.startKey);
      } catch (e) {
        console.log({ e });
      }
      setPropertiesLoading(false);
    },
    [user, properties, startKey]
  );

  useEffect(() => {
    if (!user) return;
    fetchProperties(true);
  }, [user]);

  return (
    <div id="testing" className="mx-4 mt-4" style={getPageLayout(isMobile)}>
      {!isMobile && <PortalLeftPanel />}
      <div className="lg:max-w-5xl">
        <div style={isMobile ? {} : { display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <h1 className="text-4xl">Properties</h1>
          <button
            className="bg-blue-200 mt-2 md:mt-0 p-2 mb-auto text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-40 justify-self-end text-center "
            onClick={() => setAddPropertyModalIsOpen(true)}
          >
            + New Property
          </button>
        </div>
        <SearchBar
          placeholder="Search properties..."
          searchString={propertySearchString}
          setSearchString={setPropertySearchString}
          resultsLoading={propertiesLoading}
          onSearch={() => {
            if (propertiesLoading || !propertySearchString) return;
            fetchProperties(true, propertySearchString);
          }}
          onClear={() => {
            if (propertiesLoading || !propertySearchString) return;
            setPropertySearchString('');
            fetchProperties(true);
          }}
        />
        {isMobile ? (
          <div className={`mt-4 pb-4`}>
            <div className="flex flex-col items-center">
              {properties.length ? (
                <p className="text-sm place-self-start font-light italic mb-1 ml-2 text-gray-500">
                  {'Showing ' + properties.length} {properties.length === 1 ? ' property...' : 'properties...'}
                </p>
              ) : null}
              {properties.map((property: IProperty, index) => {
                const tenantDisplayEmails = property.tenantEmails && property.tenantEmails.length ? setToShortenedString(property.tenantEmails) : '';
                return (
                  <div
                    key={`${property.pk}-${property.sk}-${index}`}
                    className={`flex flex-row items-center w-full rounded-lg py-2 px-2 h-48 bg-gray-100 shadow-[0px_1px_5px_0px_rgba(0,0,0,0.3)] ${index === 0 && 'mt-1'} ${
                      index < properties.length - 1 && 'mb-3'
                    }`}
                  >
                    <div className="pl-2 w-full text-gray-800 flex flex-col">
                      <div className="flex w-full flex-row justify-between">
                        <p className="text-xl my-auto">{toTitleCase(property.address)} </p>
                        <button
                          className="btn btn-sm bg-blue-200 hover:bg-blue-300 mr-4"
                          onClick={() => router.push(`/properties/${encodeURIComponent(deconstructKey(property.pk))}/edit`)}
                        >
                          Edit
                        </button>
                      </div>
                      <p className="text-sm mt-1">{toTitleCase(property.city)} </p>
                      <p className="text-sm mt-1">{property.state.toUpperCase()} </p>
                      <p className="text-sm mt-1">{toTitleCase(property.postalCode)} </p>
                      <p className="text-sm mt-1">{toTitleCase(property.unit)} </p>
                      <div className="text-sm mt-3">
                        Tenants: <p className={`inline ${!tenantDisplayEmails && 'text-red-500'}`}> {tenantDisplayEmails.length ? tenantDisplayEmails : 'No tenants'} </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`${propertiesLoading && 'opacity-50 pointer-events-none'} mb-2 mt-2`}>
            <div className="overflow-x-auto">
              {properties && properties.length > 0 && (
                <table className="w-full border-spacing-x-10 table-auto">
                  <thead className="">
                    <tr className="text-left text-gray-400">
                      <th className="font-normal w-72">Address</th>
                      <th className="font-normal w-40">City</th>
                      <th className="font-normal w-12">State</th>
                      <th className="font-normal w-24 pl-4">Zip</th>
                      <th className="font-normal w-36">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {properties.map((property: IProperty) => {
                      return (
                        <tr key={`${property.pk}-${property.sk}`} className="h-20">
                          <td className="border-b border-t px-4 py-1">{toTitleCase(property.address)}</td>
                          <td className="border-b border-t px-4 py-1">{toTitleCase(property.city)}</td>
                          <td className="border-b border-t px-4 py-1">{property.state.toUpperCase()}</td>
                          <td className="border-b border-t px-4 py-1">{toTitleCase(property.postalCode)}</td>
                          <td className="border-b border-t px-4 py-1">{toTitleCase(property.unit)}</td>
                          <td className="border-b border-t px-1 py-1">
                            <Link href={`/properties/${encodeURIComponent(deconstructKey(property.pk))}/edit`}>
                              <FaEdit className="text-blue-300 hover:text-blue-500 cursor-pointer" fontSize={25} />
                            </Link>
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
        {!propertiesLoading && properties.length === 0 && <div className="mt-6 font-bold text-center">Sorry, no properties found.</div>}
        {propertiesLoading && (
          <div className="mt-8">
            <LoadingSpinner containerClass="h-20" spinnerClass="spinner-large" />
          </div>
        )}
        {properties.length && startKey && !propertiesLoading ? (
          <div className="w-full flex items-center justify-center mb-24">
            <button
              onClick={() => {
                fetchProperties(false);
              }}
              className="bg-blue-200 mx-auto py-3 px-4 w-44 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mb-24"
            >
              Load more
            </button>
          </div>
        ) : (
          <div className="mb-24"></div>
        )}
      </div>
      <AddPropertyModal addPropertyModalIsOpen={addPropertyModalIsOpen} setAddPropertyModalIsOpen={setAddPropertyModalIsOpen} onSuccess={() => fetchProperties(true)} />
      {isMobile && <BottomNavigationPanel />}
    </div>
  );
};

export default Properties;
