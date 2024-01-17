import { useCallback, useEffect, useState } from 'react';
import { SingleValue } from 'react-select';
import AsyncSelect from 'react-select/async';
import axios from 'axios';
import { Option } from '@/types';
import { IUser, USER_TYPE, UserType } from '@/database/entities/user';
import { ALL_TENANTS_FILTER, USER_PERMISSION_ERROR } from '@/constants';
import { getTenantDisplayEmail, toTitleCase } from '@/utils';

export const TenantSelect = ({
  label,
  user,
  userType,
  onChange,
  modalTarget,
}: {
  label: string;
  user: IUser | null;
  userType: UserType | null;
  onChange: (option: SingleValue<Option>) => void;
  modalTarget?: string;
}) => {
  const [tenantOptions, setTenantOptions] = useState<Option[]>([]);
  const [tenantOptionsLoading, setTenantOptionsLoading] = useState<boolean>(false);

  const handleGetTenants = useCallback(
    async (_searchString?: string) => {
      setTenantOptionsLoading(true);
      try {
        if (!user || userType !== USER_TYPE.PROPERTY_MANAGER || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
          throw new Error(USER_PERMISSION_ERROR);
        }

        const { data } = await axios.post('/api/get-all-tenants-for-org', {
          organization: user.organization,
          tenantSearchString: _searchString,
          statusFilter: ALL_TENANTS_FILTER,
        });
        const response = JSON.parse(data.response);
        const processedTenants = response.tenants.map((tenant: IUser) => {
          const correctedEmail = getTenantDisplayEmail(tenant.email);
          return {
            value: tenant.email,
            label: `${toTitleCase(tenant.name)} (${correctedEmail})`,
          };
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
    if (!user || !userType) return;
    handleGetTenants();
  }, [user, userType]);

  return (
    <div className="flex flex-col align-center w-full justify-center">
      {label && (
        <div className="label">
          <span className="label-text">{label}</span>
        </div>
      )}
      <AsyncSelect
        placeholder={tenantOptionsLoading ? 'Loading...' : 'Select tenant...'}
        defaultOptions={tenantOptions}
        loadOptions={(searchString: string) => handleGetTenants(searchString)}
        id="tenant"
        onChange={(value: SingleValue<Option>) => onChange(value)}
        isClearable={true}
        menuPortalTarget={modalTarget? document.getElementById(modalTarget) ?? document.body : document.body}
        captureMenuScroll={true}
        isLoading={tenantOptionsLoading}
      />
    </div>
  );
};
