import { useCallback, useEffect, useState } from 'react';
import Select, { SingleValue } from 'react-select';
import { GetTenantsForOrgRequest } from '@/pages/api/get-all-tenants-for-org';
import axios from 'axios';
import { OptionType } from '@/types';
import { IUser } from '@/database/entities/user';

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

  const handleGetTenants = useCallback(async () => {
    try {
      if (!user || !user.email || !user.organization) return;

      const { data } = await axios.post('/api/get-all-tenants-for-org', {
        organization: user.organization,
        startKey: undefined,
        //TOD: add a fetch all items for this so its not limited by the page size
      } as GetTenantsForOrgRequest);
      const response = JSON.parse(data.response);
      const tenants: IUser[] = response.tenants;
      if (tenants.length > 0) {
        let processedTenants = tenants.map((tenant: any) => {
          return { value: tenant.tenantEmail, label: `${tenant.tenantName} (${tenant.tenantEmail})` };
        });
        setTenantOptions(processedTenants);
      }
    } catch (err) {
      console.log({ err });
    }
  }, [user, setTenantOptions, userType, setTenantOptions]);

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
      <Select options={tenantOptions} id="tenant" onChange={(value: SingleValue<OptionType>) => onChange(value)} isClearable={true} menuPortalTarget={document.body} />
    </div>
  );
};
