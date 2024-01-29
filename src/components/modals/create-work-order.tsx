import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { AddWorkOrder, Option, Property } from '@/types';
import { LoadingSpinner } from '../loading-spinner';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';
import { IUser, USER_TYPE } from '@/database/entities/user';
import { TenantSelect } from '../dropdowns/tenant-select';
import { SingleValue } from 'react-select';
import { DEFAULT_ADD_WORK_ORDER, DEFAULT_CARPETING_PADDING_OPTIONS, PTE, USER_PERMISSION_ERROR, WORK_ORDER_TYPE, WORK_ORDER_TYPE_OPTIONS } from '@/constants';
import { deconstructAllKeyValues, renderToastError, renderToastSuccess } from '@/utils';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
import { AddWorkOrderModalSchema, CreateWorkOrderSchema } from '@/types/customschemas';
import * as amplitude from '@amplitude/analytics-browser';
import Modal from './modal';
import { useDocument } from '@/hooks/use-document';
import Select from 'react-select';
import { PropertySelect } from '../dropdowns/property-select';
import { CreateableSelect } from '../dropdowns/createable-select';

const modalId = 'create-work-order';

export const CreateWorkOrderModal = ({ onSuccessfulAdd }: { onSuccessfulAdd: () => void }) => {
  const { user } = useSessionUser();
  const { userType, altName } = useUserContext();
  const { clientDocument } = useDocument();

  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);
  const [tenant, setTenant] = useState<IUser>();
  const [property, setProperty] = useState<Property>();
  const [userLoading, setUserLoading] = useState(false);
  const [areasForCarpeting, setAreasForCarpeting] = useState<string[]>([]);
  const [areasForPadding, setAreasForPadding] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    setValue,
    watch,
    formState: { isSubmitting, isValid, errors },
  } = useForm<AddWorkOrder>({
    resolver: zodResolver(AddWorkOrderModalSchema),
    mode: 'all',
    defaultValues: DEFAULT_ADD_WORK_ORDER,
  });
  const formValues = getValues();

  function closeModal() {
    (clientDocument?.getElementById(modalId) as HTMLFormElement)?.close();
    reset(DEFAULT_ADD_WORK_ORDER);
    setShowAdditionalOptions(false);
  }

  //Fetch user name and property info when pm selects tenantEmail
  useEffect(() => {
    if (!formValues.tenantEmail) return;
    async function getUserProperty() {
      setUserLoading(true);
      try {
        //Fetch additional tenant info
        const getTenantResponse = await axios.post('/api/get-user', {
          email: formValues.tenantEmail,
          userType: USER_TYPE.TENANT,
        });

        const tenant = JSON.parse(getTenantResponse.data.response) as IUser;
        const addressMap: Record<string, any> = tenant.addresses;
        let primaryAddress: any;
        Object.entries(addressMap).forEach((pair: any) => {
          if (pair[1].isPrimary) {
            primaryAddress = pair[1];
          }
        });
        const property = {
          address: primaryAddress.address,
          unit: primaryAddress.unit,
          state: primaryAddress.state,
          city: primaryAddress.city,
          postalCode: primaryAddress.postalCode,
          country: primaryAddress.country,
          numBeds: primaryAddress.numBeds,
          numBaths: primaryAddress.numBaths,
        } as Property;
        setTenant(tenant);
        setProperty(property);
      } catch (err: any) {
        console.log(err);
      }
      setUserLoading(false);
    }
    getUserProperty();
  }, [formValues.tenantEmail]);

  console.log(areasForCarpeting, areasForPadding);

  const handleCreateWorkOrder: SubmitHandler<AddWorkOrder> = useCallback(
    async (params) => {
      const woId = uuidv4();
      try {
        amplitude.track('Submit Work Order', {
          status: 'attempt',
          issueDescription: params.issueDescription,
          issueLocation: params.issueLocation ?? 'None',
          additionalDetails: params.additionalDetails ?? 'None',
          createdByType: USER_TYPE.PROPERTY_MANAGER,
          organization: user?.organization ?? 'None',
          permissionToEnter: params.permissionToEnter,
          workOrderId: woId,
        });
        if (!user || userType !== USER_TYPE.PROPERTY_MANAGER || !user?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) throw new Error(USER_PERMISSION_ERROR);

        let _property: Property | undefined = property;
        if (!params.tenantEmail) {
          const { data } = await axios.post('/api/get-property-by-id', {
            propertyId: params.propertyUUID,
          });
          const { property } = JSON.parse(data.response);
          _property = {
            address: property.address,
            unit: property.unit,
            state: property.state,
            city: property.city,
            postalCode: property.postalCode,
            country: property.country,
            numBeds: property.numBeds,
            numBaths: property.numBaths,
          };
        }

        console.log({
          ...params,
          organization: user.organization,
          pmEmail: user.email,
          pmName: altName ?? user.name,
          creatorEmail: user.email,
          creatorName: altName ?? user.name,
          woId,
          createdByType: userType,
          tenantName: tenant?.name,
          property: _property!,
          areasForCarpeting,
          areasForPadding,
        });
        const validatedBody = CreateWorkOrderSchema.parse({
          ...params,
          organization: user.organization,
          pmEmail: user.email,
          pmName: altName ?? user.name,
          creatorEmail: user.email,
          creatorName: altName ?? user.name,
          woId,
          createdByType: userType,
          tenantName: tenant?.name,
          property: _property!,
          areasForCarpeting,
          areasForPadding,
        });
        await axios.post('/api/create-work-order', validatedBody);

        amplitude.track('Submit Work Order', {
          status: 'success',
          issueDescription: params.issueDescription,
          issueLocation: params.issueLocation ?? 'None',
          additionalDetails: params.additionalDetails ?? 'None',
          createdByType: USER_TYPE.PROPERTY_MANAGER,
          organization: user?.organization ?? 'None',
          permissionToEnter: params.permissionToEnter,
          workOrderId: woId,
        });
        renderToastSuccess('Successfully Submitted Work Order!', modalId);
        onSuccessfulAdd();
        closeModal();
      } catch (err: any) {
        amplitude.track('Submit Work Order', {
          status: 'failure',
          issueDescription: params.issueDescription,
          issueLocation: params.issueLocation ?? 'None',
          additionalDetails: params.additionalDetails ?? 'None',
          createdByType: USER_TYPE.PROPERTY_MANAGER,
          organization: user?.organization ?? 'None',
          permissionToEnter: params.permissionToEnter,
          workOrderId: woId,
        });
        console.log({ err });
        renderToastError(err, 'Error Creating Work Order', modalId);
      }
    },
    [user, userType, altName, onSuccessfulAdd, tenant, property]
  );

  return (
    <Modal id={modalId} onClose={closeModal} openButtonText={'+ Work Order'} bodyClasses={'pt-3 p-6 w-11/12 max-w-2xl'}>
      <div className="w-full sticky top-0 overflow-hidden">
        <div className="text-center text-primary-content">
          <p>Create Work Order</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(handleCreateWorkOrder)} className="flex flex-col">
        <div className="flex flex-col mt-2">
          <div className="label">
            <span className="label-text">Work Order Type*</span>
          </div>
          <div className="mb-3">
            <Controller
              control={control}
              name="workOrderType"
              render={({ field: { onChange, value } }) => (
                <Select
                  className="basic-single"
                  classNamePrefix="select"
                  value={WORK_ORDER_TYPE_OPTIONS.find((option) => option.value === value)}
                  isClearable={false}
                  isSearchable={true}
                  onChange={(option: SingleValue<Option>) => {
                    reset({ ...DEFAULT_ADD_WORK_ORDER, workOrderType: option?.value.trim() ?? undefined });
                    setShowAdditionalOptions(false);
                  }}
                  name="work-order-type"
                  options={WORK_ORDER_TYPE_OPTIONS}
                  menuPortalTarget={clientDocument?.getElementById(modalId) ?? clientDocument?.body}
                />
              )}
            />
          </div>

          {watch('workOrderType') === WORK_ORDER_TYPE.MAINTENANCE_REQUEST || watch('workOrderType') === WORK_ORDER_TYPE.APPLIANCE_REPAIR ? (
            <>
              <div className="label">
                <span className="label-text">What is the issue?*</span>
              </div>
              <input className="input input-sm input-bordered" id="issueDescription" type={'text'} {...register('issueDescription', { required: true })} />
              {errors.issueDescription && <p className="text-error text-xs mt-1">{errors.issueDescription.message}</p>}
            </>
          ) : null}
          <div className="mb-3">
            {watch('workOrderType') === WORK_ORDER_TYPE.MAINTENANCE_REQUEST ? (
              <>
                <Controller
                  control={control}
                  name="tenantEmail"
                  render={({ field: { onChange, value } }) => (
                    <TenantSelect
                      label={'Select Tenant*'}
                      user={user}
                      userType={userType}
                      onChange={async (option: SingleValue<Option>) => {
                        onChange(option?.value.trim() ?? undefined);
                      }}
                      modalTarget={modalId}
                    />
                  )}
                />
                {errors.tenantEmail && <p className="text-error text-xs mt-1">{errors.tenantEmail.message}</p>}
              </>
            ) : (
              <>
                <Controller
                  control={control}
                  name="propertyUUID"
                  render={({ field: { onChange, value } }) => (
                    <PropertySelect
                      label={'Select Property*'}
                      user={user}
                      userType={userType}
                      onChange={async (option: SingleValue<Option>) => {
                        const vals = deconstructAllKeyValues(option?.value);
                        if (vals.length < 2) {
                          return;
                        }
                        onChange(vals[0]);
                        setValue('apartmentSize', vals[1]);
                      }}
                      selectedUUID={watch('propertyUUID')}
                      modalTarget={modalId}
                    />
                  )}
                />
                {errors.propertyUUID && <p className="text-error text-xs mt-1">{errors.propertyUUID.message}</p>}
              </>
            )}
            {(watch('workOrderType') === WORK_ORDER_TYPE.CARPET_JOB || watch('workOrderType') === WORK_ORDER_TYPE.PAINT_JOB) && watch('propertyUUID') ? (
              <>
                <div className="label">
                  <span className="label-text">Apartment Size*</span>
                </div>
                <input className="input input-sm input-bordered w-full" id="apartmentSize" disabled type={'text'} {...register('apartmentSize')} />
              </>
            ) : null}
          </div>
          {watch('workOrderType') === WORK_ORDER_TYPE.CARPET_JOB ? (
            <>
              <CreateableSelect
                label={'Areas for carpeting*'}
                placeholder="Start typing to add an area for carpeting..."
                defaultOptions={DEFAULT_CARPETING_PADDING_OPTIONS}
                setOptions={setAreasForCarpeting}
                modalTarget={modalId}
              />
              <CreateableSelect
                label={'Areas for padding*'}
                placeholder="Start typing to add an area for padding..."
                defaultOptions={DEFAULT_CARPETING_PADDING_OPTIONS}
                setOptions={setAreasForPadding}
                modalTarget={modalId}
              />
            </>
          ) : null}
          {watch('workOrderType') === WORK_ORDER_TYPE.MAINTENANCE_REQUEST || watch('workOrderType') === WORK_ORDER_TYPE.APPLIANCE_REPAIR ? (
            <>
              <p className="text-sm">Permission To Enter Property* </p>
              <div className="flex flex-row">
                <label className="label cursor-pointer">
                  <span className="label-text">Yes</span>
                  <input className="radio ml-3" id="permission-yes" type={'radio'} value={PTE.YES} {...register('permissionToEnter')} />
                </label>
                <label className="label cursor-pointer ml-4">
                  <span className="label-text">No</span>
                  <input className="radio ml-3" id="permission-no" type={'radio'} value={PTE.NO} {...register('permissionToEnter')} />
                </label>
              </div>

              <div className="collapse">
                <input type="checkbox" onClick={() => setShowAdditionalOptions(!showAdditionalOptions)} />
                <div className="collapse-title text-center mx-auto my-auto p-0 pt-4">
                  <button className="bg-secondary btn btn-sm">{showAdditionalOptions ? 'Hide options' : 'Show more options'}</button>
                </div>
                <div className="collapse-content -mt-4">
                  <div className="label">
                    <span className="label-text">Issue Location</span>
                  </div>
                  <input className="input input-sm input-bordered w-full" id="issueLocation" type={'text'} {...register('issueLocation')} />
                  <div className="label">
                    <span className="label-text">Additional Details</span>
                  </div>
                  <input className="input input-sm input-bordered w-full" id="additionalDetails" type={'text'} {...register('additionalDetails')} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="label">
                <span className="label-text">Move In Date*</span>
              </div>
              <input className="input input-sm input-bordered w-full" id="moveInDate" type={'text'} placeholder="ex. 1/10/23" {...register('moveInDate')} />
              {errors.moveInDate && <p className="text-error text-xs mt-1">{errors.moveInDate.message}</p>}'
            </>
          )}
        </div>
        <button
          className="btn mt-3 btn-primary"
          type="submit"
          disabled={isSubmitting || !isValid || userLoading || (watch('workOrderType') === WORK_ORDER_TYPE.CARPET_JOB && (!areasForCarpeting.length || !areasForPadding.length))}
        >
          {isSubmitting ? <LoadingSpinner /> : userLoading ? 'Loading...' : 'Create Work Order'}
        </button>
      </form>
    </Modal>
  );
};
