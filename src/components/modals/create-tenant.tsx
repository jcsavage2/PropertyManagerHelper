import { useUserContext } from '@/context/user';
import axios from 'axios';
import { useCallback, useState } from 'react';
import { StateSelect } from '../dropdowns/state-select';
import { useDevice } from '@/hooks/use-window-size';
import PropertyListSelector from '../property-list-selector';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { LoadingSpinner } from '../loading-spinner';
import { deconstructKey,  renderToastError, renderToastSuccess } from '@/utils';
import { USER_TYPE } from '@/database/entities/user';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { USER_PERMISSION_ERROR, DEFAULT_PROPERTY_WITH_ID } from '@/constants';
import { CreateTenant_Address, CreateTenant_TenantInfo, Property } from '@/types';
import { CreateTenant_AddressSchema, CreateTenantSchema, CreateTenant_TenantInfoSchema } from '@/types/customschemas';
import { v4 as uuidv4 } from 'uuid';
import Modal from './modal';
import { useDocument } from '@/hooks/use-document';

const modalId = 'add-tenant-modal';

export const AddTenantModal = ({ onSuccessfulAdd }: { onSuccessfulAdd: () => void }) => {
  const { user } = useSessionUser();
  const { isMobile } = useDevice();
  const { altName, userType } = useUserContext();
  const {clientDocument} = useDocument();
  const [stage, setStage] = useState(0);
  const [createNewProperty, setCreateNewProperty] = useState(true);

  const tenantInfoForm = useForm<CreateTenant_TenantInfo>({
    resolver: zodResolver(CreateTenant_TenantInfoSchema),
    mode: 'all',
  });
  const propertyForm = useForm<CreateTenant_Address>({
    resolver: zodResolver(CreateTenant_AddressSchema),
    defaultValues: { property: DEFAULT_PROPERTY_WITH_ID },
    mode: 'all',
  });

  const closeModal = () => {
    (clientDocument?.getElementById(modalId) as HTMLFormElement)?.close();
    tenantInfoForm.reset();
    propertyForm.reset();
    setCreateNewProperty(true);
    setStage(0);
  };

  const handleValidateTenantInfo: SubmitHandler<CreateTenant_TenantInfo> = async () => {
    propertyForm.setValue('property.propertyUUId', uuidv4());
    setStage(1);
  };

  const handleCreateNewTenant: SubmitHandler<CreateTenant_Address> = useCallback(
    async (params) => {
      try {
        if (userType !== USER_TYPE.PROPERTY_MANAGER || !user?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) throw new Error(USER_PERMISSION_ERROR);

        let property: Property | null = params.property;
        let duplicateExists = false;

        if (createNewProperty) {
          const { data } = await axios.post('/api/get-properties-by-address', {
            organization: user?.organization,
            property,
          });

          const properties = JSON.parse(data.response).properties;
          if (properties.length > 0) {
            const { address, unit, city, state, postalCode, country, pk, numBeds, numBaths } = properties[0];
            property = {
              address,
              unit,
              city,
              state,
              postalCode,
              country,
              propertyUUId: deconstructKey(pk),
              numBeds,
              numBaths,
            };
            duplicateExists = true;
          }
        }

        const body = CreateTenantSchema.parse({
          property,
          ...tenantInfoForm.getValues(),
          createNewProperty: duplicateExists ? false : createNewProperty,
        });

        const { data } = await axios.post('/api/create-tenant', body);

        const parsedUser = JSON.parse(data.response);
        if (parsedUser) {
          closeModal();
          onSuccessfulAdd();
          renderToastSuccess('Tenant Created!');
        }
      } catch (err: any) {
        console.log({ err });
        renderToastError(err, 'Error Creating Tenant. Please Try Again', modalId);
      }
    },
    [user, userType, setStage, onSuccessfulAdd, createNewProperty, tenantInfoForm]
  );

  const renderPreviousButton = () => {
    return (
      <button
        onClick={() => {
          setStage(0);
        }}
        className="mt-3 btn btn-secondary "
        type="button"
      >
        Previous
      </button>
    );
  };

  const renderSubmitButton = () => {
    return (
      <button className="btn mt-3 btn-primary" type="submit" disabled={propertyForm.formState.isSubmitting || !propertyForm.formState.isValid}>
        {propertyForm.formState.isSubmitting ? <LoadingSpinner /> : 'Create Tenant'}
      </button>
    );
  };

  return (
    <Modal id={modalId} onClose={closeModal} openButtonText="+ Tenant" buttonClasses="mr-4" overflowVisible={false}>
      {stage === 0 ? (
        <form onSubmit={tenantInfoForm.handleSubmit(handleValidateTenantInfo)}>
          <div style={{ display: 'grid' }}>
            <input
              className="input input-sm input-bordered mt-5"
              id="name"
              placeholder="Tenant Full Name*"
              type={'text'}
              {...tenantInfoForm.register('tenantName', {
                required: true,
              })}
            />
            {tenantInfoForm.formState.errors.tenantName && <div className="text-error text-xs">{tenantInfoForm.formState.errors.tenantName.message}</div>}
            <input
              className="input input-sm input-bordered  mt-5"
              id="email"
              placeholder="Tenant Email (if none provided, they won't be notified)"
              type={'email'}
              {...tenantInfoForm.register('tenantEmail', {
                required: false,
              })}
            />
            {tenantInfoForm.formState.errors.tenantEmail && <div className="text-error text-xs">{tenantInfoForm.formState.errors.tenantEmail.message}</div>}
            <input type="hidden" {...tenantInfoForm.register('pmEmail')} value={user?.email ?? ''} />
            <input type="hidden" {...tenantInfoForm.register('pmName')} value={altName ?? user?.name ?? ''} />
            <input type="hidden" {...tenantInfoForm.register('organization')} value={user?.organization ?? ''} />
            <input type="hidden" {...tenantInfoForm.register('organizationName')} value={user?.organizationName ?? ''} />
            <button className="btn mt-3 btn-primary" type="submit" disabled={tenantInfoForm.formState.isSubmitting || !tenantInfoForm.formState.isValid}>
              Next
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex mt-2 flex-row items-center md:w-3/4 w-full mx-auto justify-center">
            <div
              onClick={() => {
                if (createNewProperty) return;
                setCreateNewProperty(true);
                propertyForm.setValue('property', DEFAULT_PROPERTY_WITH_ID);
                propertyForm.setValue('property.propertyUUId', uuidv4());
              }}
              className={`rounded mr-2 md:mr-8 p-2 border-b-2 cursor-pointer hover:bg-secondary md:w-full text-center ${createNewProperty && 'bg-primary'}`}
            >
              {isMobile ? 'New Property' : 'Create New Property'}
            </div>
            <div
              onClick={() => {
                if (!createNewProperty) return;
                setCreateNewProperty(false);
                propertyForm.setValue('property', null);
              }}
              className={`rounded md:ml-8 p-2 border-b-2 cursor-pointer hover:bg-secondary md:w-full text-center ${!createNewProperty && 'bg-primary'}`}
            >
              {isMobile ? 'Existing Property' : 'Use Existing Property'}
            </div>
          </div>
          {createNewProperty ? (
            <form onSubmit={propertyForm.handleSubmit(handleCreateNewTenant)}>
              <div style={{ display: 'grid' }}>
                <div className="w-full" style={{ display: 'grid' }}>
                  <div className="label">
                    <span className="label-text">Address*</span>
                  </div>
                  <input
                    className="input input-sm input-bordered"
                    placeholder="123 some street"
                    id="address"
                    type={'text'}
                    {...propertyForm.register('property.address', {
                      required: true,
                    })}
                  />
                  {propertyForm.formState.errors.property?.address && <div className="text-error text-xs">{propertyForm.formState.errors.property?.address?.message}</div>}
                  <div className="label">
                    <span className="label-text">Unit</span>
                  </div>
                  <input className="input input-sm input-bordered" id="unit" placeholder="1704" type={'text'} {...propertyForm.register('property.unit')} />
                  {propertyForm.formState.errors.property?.unit && <div className="text-error text-xs">{propertyForm.formState.errors.property?.unit?.message}</div>}
                  <Controller
                    control={propertyForm.control}
                    name="property.state"
                    render={({ field: { onChange, value } }) => <StateSelect state={value} setState={onChange} label={'State*'} placeholder="Select..." />}
                  />
                  <div className="label">
                    <span className="label-text">City*</span>
                  </div>
                  <input
                    className="input input-sm input-bordered"
                    id="address"
                    type={'text'}
                    placeholder="Springfield"
                    {...propertyForm.register('property.city', {
                      required: true,
                    })}
                  />
                  {propertyForm.formState.errors.property?.city && <div className="text-error text-xs">{propertyForm.formState.errors.property?.city?.message}</div>}
                  <div className="label">
                    <span className="label-text">Postal Code*</span>
                  </div>
                  <input
                    className="input input-sm input-bordered"
                    id="postalCode"
                    type={'text'}
                    {...propertyForm.register('property.postalCode', {
                      required: true,
                    })}
                    placeholder="000000"
                  />
                  {propertyForm.formState.errors.property?.postalCode && (
                    <div className="text-error text-xs">{propertyForm.formState.errors.property?.postalCode?.message}</div>
                  )}
                  <div className={`flex flex-row w-5/6 mt-4 mb-2 items-center sm:w-full`}>
                    <div className="label">
                      <span className="label-text">Beds*</span>
                    </div>
                    <input
                      className="input input-sm input-bordered mr-auto"
                      type="number"
                      id="beds"
                      step={1}
                      min={1}
                      max={10}
                      {...propertyForm.register('property.numBeds', {
                        required: true,
                      })}
                    />
                    <div className="label">
                      <span className="label-text">Baths*</span>
                    </div>
                    <input
                      className="input input-sm input-bordered mr-auto"
                      type="number"
                      id="baths"
                      min={1}
                      max={10}
                      step={0.5}
                      {...propertyForm.register('property.numBaths', {
                        required: true,
                      })}
                    />
                  </div>
                </div>
                {renderPreviousButton()}
                {renderSubmitButton()}
              </div>
            </form>
          ) : (
            <form onSubmit={propertyForm.handleSubmit(handleCreateNewTenant)}>
              <div style={{ display: 'grid' }}>
                <Controller
                  control={propertyForm.control}
                  name="property"
                  render={({ field: { onChange, value } }) => (
                    <PropertyListSelector selectedProperty={value} setSelectedProperty={onChange} organization={user?.organization ?? ''} />
                  )}
                />
                {renderPreviousButton()}
                {renderSubmitButton()}
              </div>
            </form>
          )}
        </>
      )}
    </Modal>
  );
};
