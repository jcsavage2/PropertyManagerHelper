import { useUserContext } from '@/context/user';
import axios from 'axios';
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { CSSTransition } from 'react-transition-group';
import { StateSelect } from './state-select';
import { useDevice } from '@/hooks/use-window-size';
import PropertySelector from './property-selector';
import { v4 as uuid } from 'uuid';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { LoadingSpinner } from './loading-spinner/loading-spinner';
import { toggleBodyScroll } from '@/utils';
import { userRoles } from '@/database/entities/user';
import { validatePropertyWithId, lowerCaseRequiredEmail, lowerCaseRequiredString } from '@/types/zodvalidators';
import { z } from 'zod';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { API_STATUS, EMAIL_MATCHING_ERROR, USER_PERMISSION_ERROR, defaultProperty, defaultPropertyWithId } from '@/constants';

//Used to validate tenant info in stage 0
export const TenantInfoSchema = z.object({
  tenantEmail: lowerCaseRequiredEmail,
  tenantName: lowerCaseRequiredString,
  organization: z.string().min(1),
  organizationName: z.string().min(1),
  pmEmail: lowerCaseRequiredEmail,
  pmName: lowerCaseRequiredString,
});
export type TenantInfoSchemaType = z.infer<typeof TenantInfoSchema>;

//Used to validate address input
export const AddressSchema = z.object({
  property: z.union([validatePropertyWithId, z.null()]).default(defaultPropertyWithId),
});
export type AddressSchemaType = z.infer<typeof AddressSchema>;

//Used to validate params in api
export const CreateTenantSchema = AddressSchema.merge(TenantInfoSchema).merge(z.object({ createNewProperty: z.boolean().default(true) }));
export type CreateTenantSchemaType = z.infer<typeof CreateTenantSchema>;

export const AddTenantModal = ({
  tenantModalIsOpen,
  setTenantModalIsOpen,
  onSuccessfulAdd,
}: {
  tenantModalIsOpen: boolean;
  setTenantModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onSuccessfulAdd: () => void;
}) => {
  const { user } = useSessionUser();
  const { isMobile } = useDevice();
  const { altName, userType } = useUserContext();

  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      transform: 'translate(-50%, -50%)',
      width: isMobile ? '90%' : '60%',
      maxHeight: '90%',
      backgroundColor: 'rgba(255, 255, 255)',
    },
    overLay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(25, 255, 255, 0.75)',
    },
  };

  const [stage, setStage] = useState(0);
  const [createNewProperty, setCreateNewProperty] = useState(true);

  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);
  isBrowser && Modal.setAppElement('#tenants');

  const tenantInfoForm = useForm<TenantInfoSchemaType>({ resolver: zodResolver(TenantInfoSchema) });
  const createNewPropertyForm = useForm<AddressSchemaType>({ resolver: zodResolver(AddressSchema) });
  const useExistingPropertyForm = useForm<AddressSchemaType>({ resolver: zodResolver(AddressSchema) });

  const closeModal = () => {
    tenantInfoForm.reset();
    createNewPropertyForm.reset();
    useExistingPropertyForm.reset();
    setStage(0);
    setTenantModalIsOpen(false);
  };

  const handleValidateTenantInfo: SubmitHandler<TenantInfoSchemaType> = async (params) => {
    if (params.tenantEmail === params.pmEmail) {
      console.log('email matching error');
      tenantInfoForm.setError('tenantEmail', { message: EMAIL_MATCHING_ERROR });
      return;
    }

    setStage(1);
  };

  const handleCreateNewTenant: SubmitHandler<AddressSchemaType> = useCallback(
    async (params) => {
      try {
        if (userType !== userRoles.PROPERTY_MANAGER || !user?.roles?.includes(userRoles.PROPERTY_MANAGER)) throw new Error(USER_PERMISSION_ERROR);

        const body = {
          ...params,
          ...tenantInfoForm.getValues(),
          createNewProperty,
        };
        const validatedBody = CreateTenantSchema.parse(body);

        const res = await axios.post('/api/create-tenant', validatedBody);
        if (res.status !== API_STATUS.SUCCESS) throw new Error(res.data.response);

        const parsedUser = JSON.parse(res.data.response);
        if (parsedUser) {
          closeModal();
          onSuccessfulAdd();
          toast.success('Tenant Created!', {
            position: toast.POSITION.TOP_CENTER,
            draggable: false,
          });
          setTenantModalIsOpen(false);
        }

        setStage(0);
      } catch (err) {
        console.log({ err });
        toast.error((err as any)?.response?.data?.response ?? "Error Creating Tenant. Please Try Again", {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
      }
    },
    [user, userType, setStage, onSuccessfulAdd, setTenantModalIsOpen, createNewProperty, tenantInfoForm]
  );

  const renderPreviousButton = () => {
    return (
      <button
        onClick={() => setStage(0)}
        className="bg-blue-200 p-3 mt-7 text-gray-600 w-full hover:bg-blue-300 rounded disabled:opacity-25"
        type="button"
      >
        Previous
      </button>
    );
  };

  return (
    <Modal
      isOpen={tenantModalIsOpen}
      onAfterOpen={() => toggleBodyScroll(true)}
      onAfterClose={() => toggleBodyScroll(false)}
      contentLabel="Add Tenant Modal"
      closeTimeoutMS={200}
      style={customStyles}
    >
      <div className="w-full text-right">
        <button className="bg-blue-200 px-2 py-1 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" onClick={() => closeModal()}>
          X Close
        </button>
      </div>

      <CSSTransition in={stage === 0} timeout={500} classNames="slide" unmountOnExit>
        <form onSubmit={tenantInfoForm.handleSubmit(handleValidateTenantInfo)}>
          <div style={{ display: 'grid' }}>
            <input
              className="rounded px-1 border-solid border-2 border-slate-200 mt-5"
              id="name"
              placeholder="Tenant Full Name*"
              type={'text'}
              {...tenantInfoForm.register('tenantName')}
            />
            {tenantInfoForm.formState.errors.tenantName && (
              <div className="text-red-500 text-xs">{tenantInfoForm.formState.errors.tenantName.message}</div>
            )}
            <input
              className="rounded px-1 border-solid border-2 border-slate-200 mt-5"
              id="email"
              placeholder="Tenant Email*"
              type={'email'}
              {...tenantInfoForm.register('tenantEmail')}
            />
            {tenantInfoForm.formState.errors.tenantEmail && (
              <div className="text-red-500 text-xs">{tenantInfoForm.formState.errors.tenantEmail.message}</div>
            )}
            <input type="hidden" {...tenantInfoForm.register('pmEmail')} value={user?.email ?? ''} />
            <input type="hidden" {...tenantInfoForm.register('pmName')} value={altName ?? user?.name ?? ''} />
            <input type="hidden" {...tenantInfoForm.register('organization')} value={user?.organization ?? ''} />
            <input type="hidden" {...tenantInfoForm.register('organizationName')} value={user?.organizationName ?? ''} />
            <button
              className="bg-blue-200 p-3 mt-7 text-gray-500 hover:bg-blue-300 rounded disabled:opacity-25"
              type="submit"
              disabled={tenantInfoForm.formState.isSubmitting || !tenantInfoForm.formState.isValid}
            >
              Next
            </button>
          </div>
        </form>
      </CSSTransition>
      <CSSTransition in={stage === 1} timeout={500} classNames="slide" unmountOnExit style={{ display: 'grid' }}>
        <>
          <div className="flex mt-2 flex-row items-center md:w-3/4 w-full mx-auto justify-center">
            <div
              onClick={() => {
                setCreateNewProperty(true);
                createNewPropertyForm.reset({ property: defaultProperty });
              }}
              className={`rounded mr-2 md:mr-8 p-2 border-b-2 cursor-pointer hover:bg-blue-300 hover:border-blue-300 md:w-full text-center ${
                createNewProperty && 'bg-blue-200 border-blue-200'
              }`}
            >
              {isMobile ? 'New Property' : 'Create New Property'}
            </div>
            <div
              onClick={() => {
                setCreateNewProperty(false);
                useExistingPropertyForm.reset();
              }}
              className={`rounded md:ml-8 p-2 border-b-2 cursor-pointer hover:bg-blue-300 hover:border-blue-300 md:w-full text-center ${
                !createNewProperty && 'bg-blue-200 border-blue-200'
              }`}
            >
              {isMobile ? 'Existing Property' : 'Use Existing Property'}
            </div>
          </div>
          {stage === 1 ? (
            createNewProperty ? (
              <form onSubmit={createNewPropertyForm.handleSubmit(handleCreateNewTenant)}>
                <div style={{ display: 'grid' }}>
                  <div className="w-full" style={{ display: 'grid' }}>
                    <label htmlFor="address">Address* </label>
                    <input
                      className="rounded px-1 border-solid border-2 border-slate-200 text-gray-600"
                      placeholder="123 some street"
                      id="address"
                      type={'text'}
                      {...createNewPropertyForm.register('property.address')}
                    />
                    <label htmlFor="unit">Unit </label>
                    <input
                      className="rounded px-1 border-solid border-2 border-slate-200"
                      id="unit"
                      placeholder="1704"
                      type={'text'}
                      {...createNewPropertyForm.register('property.unit')}
                    />
                    <Controller
                      control={createNewPropertyForm.control}
                      name="property.state"
                      render={({ field: { onChange, value } }) => (
                        <StateSelect state={value} setState={onChange} label={'State*'} placeholder="Select..." />
                      )}
                    />
                    <label htmlFor="address">City*</label>
                    <input
                      className="rounded px-1 border-solid border-2 border-slate-200"
                      id="address"
                      type={'text'}
                      placeholder="Springfield"
                      {...createNewPropertyForm.register('property.city')}
                    />
                    <label htmlFor="address">Zip* </label>
                    <input
                      className="rounded px-1 border-solid border-2 border-slate-200"
                      id="address"
                      type={'text'}
                      {...createNewPropertyForm.register('property.postalCode')}
                      placeholder="000000"
                    />
                    <div className={`flex flex-row w-5/6 mt-2 mb-2 items-center sm:w-full`}>
                      <label className="text-center mr-4" htmlFor="beds">
                        Beds*:{' '}
                      </label>
                      <input
                        className="rounded px-1 border-solid border-2 border-slate-200 w-20 mr-auto"
                        type="number"
                        id="beds"
                        step={1}
                        min={1}
                        max={10}
                        {...createNewPropertyForm.register('property.numBeds')}
                      />
                      <label className="text-center ml-2 mr-4" htmlFor="baths">
                        Baths*:{' '}
                      </label>
                      <input
                        className="rounded px-1 border-solid border-2 border-slate-200 w-20 mr-auto"
                        type="number"
                        id="baths"
                        min={1}
                        max={10}
                        step={0.5}
                        {...createNewPropertyForm.register('property.numBaths')}
                      />
                      <input type="hidden" {...createNewPropertyForm.register('property.propertyUUId')} value={uuid()} />
                    </div>
                  </div>
                  {renderPreviousButton()}
                  <button
                    className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
                    type="submit"
                    disabled={createNewPropertyForm.formState.isSubmitting || !createNewPropertyForm.formState.isValid}
                  >
                    {createNewPropertyForm.formState.isSubmitting ? <LoadingSpinner /> : 'Add Tenant'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={useExistingPropertyForm.handleSubmit(handleCreateNewTenant)}>
                <div style={{ display: 'grid' }}>
                  <Controller
                    control={useExistingPropertyForm.control}
                    name="property"
                    render={({ field: { onChange, value } }) => (
                      <PropertySelector selectedProperty={value} setSelectedProperty={onChange} orgId={user?.organization ?? ''} />
                    )}
                  />
                  {renderPreviousButton()}
                  <button
                    className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
                    type="submit"
                    disabled={useExistingPropertyForm.formState.isSubmitting || !useExistingPropertyForm.formState.isValid}
                  >
                    {useExistingPropertyForm.formState.isSubmitting ? <LoadingSpinner /> : 'Add Tenant'}
                  </button>
                </div>
              </form>
            )
          ) : null}
        </>
      </CSSTransition>
    </Modal>
  );
};
