import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useDevice } from '@/hooks/use-window-size';
import { CreatePropertyModal } from '@/components/modals/create-property';
import React from 'react';
import { IProperty } from '@/database/entities/property';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { deconstructKey, setToShortenedString, toTitleCase } from '@/utils';
import { StartKey } from '@/database/entities';
import { LoadingSpinner } from '@/components/loading-spinner';
import { FaEdit } from 'react-icons/fa';
import Link from 'next/link';
import { useUserContext } from '@/context/user';
import { USER_TYPE } from '@/database/entities/user';
import { USER_PERMISSION_ERROR } from '@/constants';
import { useRouter } from 'next/router';
import { SearchBar } from '@/components/search-bar';
import MobileCard from '@/components/mobile-card';
import AdminPortal from '@/components/layouts/admin-portal';
import LoadMore from '@/components/load-more';

const Properties = () => {
  const router = useRouter();
  const { user } = useSessionUser();
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
    <AdminPortal id="properties" isLoading={!user || !userType}>
      <div className="flex flex-row justify-between">
        <h1 className="text-4xl">Properties</h1>
        <CreatePropertyModal onSuccess={() => fetchProperties(true)} />
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
        <div className={`${propertiesLoading && 'opacity-50 pointer-events-none'} mt-4 pb-4`}>
          <div className="flex flex-col items-center">
            {properties.length ? (
              <p className="text-sm place-self-start font-light italic mb-1 ml-2">
                {'Showing ' + properties.length} {properties.length === 1 ? ' property...' : 'properties...'}
              </p>
            ) : null}
            {properties.map((property: IProperty, index) => {
              const tenantDisplayEmails = property.tenantEmails && property.tenantEmails.length ? setToShortenedString(property.tenantEmails) : '';
              return (
                <MobileCard title={toTitleCase(property.address)} key={`${property.pk}-${property.sk}-${index}`}>
                  <div className="w-full text-gray-800 flex flex-col text-sm child:mt-1">
                    <p className="">{toTitleCase(property.city)} </p>
                    <p className="">{property.state.toUpperCase()} </p>
                    <p className="">{toTitleCase(property.postalCode)} </p>
                    <p className="">{toTitleCase(property.unit)} </p>
                    <div className="">
                      Tenants: <p className={`inline ${!tenantDisplayEmails && 'text-error'}`}> {tenantDisplayEmails.length ? tenantDisplayEmails : 'No tenants'} </p>
                    </div>
                    <button
                      className="btn btn-sm btn-primary w-1/3 place-self-end"
                      onClick={() => router.push(`/properties/${encodeURIComponent(deconstructKey(property.pk))}/edit`)}
                    >
                      Edit
                    </button>
                  </div>
                </MobileCard>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={`${propertiesLoading && 'opacity-50 pointer-events-none'} mb-2 mt-2`}>
          <div className="overflow-x-auto">
            {properties && properties.length > 0 && (
              <table className="table table">
                <thead className="">
                  <tr className="">
                    <th className="">Address</th>
                    <th className="">City</th>
                    <th className="">State</th>
                    <th className="">Zip</th>
                    <th className="">Unit</th>
                  </tr>
                </thead>
                <tbody className="">
                  {properties.map((property: IProperty) => {
                    return (
                      <tr key={`${property.pk}-${property.sk}`} className="h-20">
                        <td className="">{toTitleCase(property.address)}</td>
                        <td className="">{toTitleCase(property.city)}</td>
                        <td className="">{property.state.toUpperCase()}</td>
                        <td className="">{toTitleCase(property.postalCode)}</td>
                        <td className="">{toTitleCase(property.unit)}</td>
                        <td className="">
                          <Link href={`/properties/${encodeURIComponent(deconstructKey(property.pk))}/edit`}>
                            <FaEdit className="text-secondary hover:text-primary cursor-pointer" fontSize={25} />
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
      {propertiesLoading ? (
        <div className="mt-4">
          <LoadingSpinner containerClass="h-20" spinnerClass="spinner-large" />
        </div>
      ) : (
        <div className="w-full flex items-center justify-center">
          <LoadMore isDisabled={propertiesLoading} isVisible={properties && properties.length && startKey} onClick={() => fetchProperties(false)} />
        </div>
      )}
    </AdminPortal>
  );
};

export default Properties;
