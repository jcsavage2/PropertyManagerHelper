import { useCallback, useEffect, useState } from 'react';
import { SingleValue } from 'react-select';
import AsyncSelect from 'react-select/async';
import axios from 'axios';
import { IUser, USER_TYPE, UserType } from '@/database/entities/user';
import { Option } from '@/types';
import { useDocument } from '@/hooks/use-document';
import { USER_PERMISSION_ERROR } from '@/constants';
import { deconstructKey, toTitleCase } from '@/utils';
import { IProperty } from '@/database/entities/property';

export const PropertySelect = ({
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
  const [propertyOptions, setPropertyOptions] = useState<Option[]>([]);
  const [propertyOptionsLoading, setPropertyOptionsLoading] = useState<boolean>(false);
  const {clientDocument} = useDocument();

  const handleGetProperties = useCallback(
    async (_searchString?: string) => {
      setPropertyOptionsLoading(true);
      try {
        if (!user || userType !== USER_TYPE.PROPERTY_MANAGER || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
          throw new Error(USER_PERMISSION_ERROR);
        }

        const { data } = await axios.post('/api/get-all-properties', {
          organization: user?.organization,
          propertySearchString: _searchString,
        });
        const response = JSON.parse(data.response);
        const processedProperties = response.properties.map((property: IProperty) => {
          return {
            value: deconstructKey(property.pk),
            label: `${toTitleCase(property.address)} (${property.unit ? property.unit : ''})`
          };
        });
        if (!_searchString) {
          setPropertyOptions(processedProperties);
        } else {
          setPropertyOptionsLoading(false);
          return processedProperties;
        }
      } catch (err) {
        console.log({ err });
      }
      setPropertyOptionsLoading(false);
    },
    [user, setPropertyOptions, userType]
  );

  useEffect(() => {
    if (!user || !userType) return;
    handleGetProperties();
  }, [user, userType]);

  return (
    <div className="flex flex-col align-center w-full justify-center">
      {label && (
        <div className="label">
          <span className="label-text">{label}</span>
        </div>
      )}
      <AsyncSelect
        placeholder={propertyOptionsLoading ? 'Loading...' : 'Select property...'}
        defaultOptions={propertyOptions}
        loadOptions={(searchString: string) => handleGetProperties(searchString)}
        id="tenant"
        onChange={(value: SingleValue<Option>) => onChange(value)}
        isClearable={true}
        menuPortalTarget={modalTarget ? clientDocument?.getElementById(modalTarget) ?? clientDocument?.body : clientDocument?.body}
        captureMenuScroll={true}
        isLoading={propertyOptionsLoading}
      />
    </div>
  );
};
