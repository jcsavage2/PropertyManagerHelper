import { useCallback, useEffect, useState } from 'react';
import { SingleValue } from 'react-select';
import AsyncSelect from 'react-select/async';
import { GetTenantsForOrgRequest } from '@/pages/api/get-all-tenants-for-org';
import axios from 'axios';
import { OptionType } from '@/types';
import { IUser, userRoles } from '@/database/entities/user';
import { ENTITIES } from '@/database/entities';

export const TenantSelect = ({
  label,
  user,
  userType,
  onChange,
  shouldFetch,
}: {
  label: string;
  user: IUser | null;
  userType: 'PROPERTY_MANAGER' | 'TECHNICIAN' | 'TENANT' | null;
  onChange: (option: SingleValue<OptionType>) => void;
  shouldFetch: boolean;
}) => {
  const [tenantOptions, setTenantOptions] = useState<OptionType[]>([]);
  const [tenantOptionsLoading, setTenantOptionsLoading] = useState<boolean>(false);

  const handleGetTenants = useCallback(
    async (_searchString?: string) => {
      setTenantOptionsLoading(true);
      try {
        if (
          !user ||
          !user.email ||
          userType !== ENTITIES.PROPERTY_MANAGER ||
          !user.roles?.includes(userRoles.PROPERTY_MANAGER) ||
          !user.organization
        ) {
          throw new Error('user must be a property manager in an organization');
        }
        const { data } = await axios.post('/api/get-all-tenants-for-org', {
          organization: user.organization,
          startKey: undefined,
          tenantSearchString: _searchString,
        } as GetTenantsForOrgRequest);
        const response = JSON.parse(data.response);
        const processedTenants = response.tenants.map((tenant: IUser) => {
          return { value: tenant.email, label: `${tenant.name} (${tenant.email})` };
        });
        if (!_searchString) {
          setTenantOptions(processedTenants);
        } else {
          setTenantOptionsLoading(false);
          return processedTenants;
        }
      } catch (err) {
        console.log({ err });
      }
      setTenantOptionsLoading(false);
    },
    [user, setTenantOptions, userType, setTenantOptions]
  );

  useEffect(() => {
    if (shouldFetch) {
      handleGetTenants();
    }
  }, [shouldFetch]);

  return (
    <div className="flex flex-col align-center w-full">
      <label htmlFor="tenant" className="mt-2">
        {label}
      </label>
      <AsyncSelect
        placeholder={tenantOptionsLoading ? 'Loading...' : 'Select tenant...'}
        defaultOptions={tenantOptions}
        loadOptions={(searchString: string) => handleGetTenants(searchString)}
        id="tenant"
        onChange={(value: SingleValue<OptionType>) => onChange(value)}
        isClearable={true}
        menuPortalTarget={document.body}
        captureMenuScroll={false}
        isLoading={tenantOptionsLoading}
      />
    </div>
  );
};
