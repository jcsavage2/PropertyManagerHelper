import axios from 'axios';
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { AddWorkOrder, Option, Property } from '@/types';
import { LoadingSpinner } from './loading-spinner/loading-spinner';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';
import { IUser, USER_TYPE } from '@/database/entities/user';
import { TenantSelect } from './tenant-select';
import { SingleValue } from 'react-select';
import { useDevice } from '@/hooks/use-window-size';
import { PTE, USER_PERMISSION_ERROR } from '@/constants';
import { MdOutlineKeyboardDoubleArrowDown, MdOutlineKeyboardDoubleArrowUp } from 'react-icons/md';
import { renderToastError, toggleBodyScroll } from '@/utils';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
import { AddWorkOrderModalSchema, CreateWorkOrderSchema } from '@/types/customschemas';
import * as amplitude from '@amplitude/analytics-browser';

export const AddWorkOrderModal = ({
  addWorkOrderModalIsOpen,
  setAddWorkOrderModalIsOpen,
  onSuccessfulAdd,
}: {
  addWorkOrderModalIsOpen: boolean;
  setAddWorkOrderModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onSuccessfulAdd: () => void;
}) => {
  const { user } = useSessionUser();
  const { userType, altName } = useUserContext();
  const { isMobile } = useDevice();

  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);
  const [tenant, setTenant] = useState<IUser>();
  const [property, setProperty] = useState<Property>();
  const [userLoading, setUserLoading] = useState(false);

  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      transform: 'translate(-50%, -50%)',
      width: isMobile ? '90%' : '50%',
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

  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);
  isBrowser && Modal.setAppElement('#workOrder');

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { isSubmitting, isValid, errors },
  } = useForm<AddWorkOrder>({
    resolver: zodResolver(AddWorkOrderModalSchema),
    mode: 'all',
    defaultValues: { permissionToEnter: PTE.YES },
  });
  const formValues = getValues();

  function closeModal() {
    setAddWorkOrderModalIsOpen(false);
    reset();
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
        if (
          !user ||
          userType !== USER_TYPE.PROPERTY_MANAGER ||
          !user?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)
        )
          throw new Error(USER_PERMISSION_ERROR);

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
          property,
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
        toast.success('Successfully Submitted Work Order!', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
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
        renderToastError(err, 'Error Creating Work Order');
      }
    },
    [user, userType, altName, onSuccessfulAdd, tenant, property]
  );

  return (
    <Modal
      isOpen={addWorkOrderModalIsOpen}
      onAfterOpen={() => toggleBodyScroll(true)}
      onAfterClose={() => toggleBodyScroll(false)}
      onRequestClose={closeModal}
      contentLabel="Example Modal"
      closeTimeoutMS={200}
      style={customStyles}
    >
      <div className="w-full text-center mb-2 h-6">
        <button
          className="float-right bg-blue-200 px-2 py-1 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          onClick={closeModal}
        >
          X Close
        </button>
        <p className="clear-left text-lg md:w-2/5 mx-auto pt-0.5">Create New Work Order</p>
      </div>

      <form onSubmit={handleSubmit(handleCreateWorkOrder)} className="flex flex-col">
        <div className="flex flex-col mt-4">
          <label htmlFor="issueDescription">What is the issue?* </label>
          <input
            className="rounded px-1 border-solid border-2 border-slate-200 mb-1"
            id="issueDescription"
            type={'text'}
            {...register('issueDescription', { required: true })}
          />
          {errors.issueDescription && (
            <p className="text-red-500 text-xs">{errors.issueDescription.message}</p>
          )}
          <div className="mb-5">
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
                  shouldFetch={addWorkOrderModalIsOpen}
                />
              )}
            />
            {errors.tenantEmail && (
              <p className="text-red-500 text-xs mt-1">{errors.tenantEmail.message}</p>
            )}
          </div>
          <div className="mb-5">
            <p className="mt-2">Permission To Enter Property* </p>
            <input
              className="rounded px-1"
              id="permission-yes"
              type={'radio'}
              value={PTE.YES}
              {...register('permissionToEnter')}
            />
            <label htmlFor="permission-yes">{PTE.YES}</label>
            <input
              className="rounded px-1 ml-4"
              id="permission-no"
              type={'radio'}
              value={PTE.NO}
              {...register('permissionToEnter')}
            />
            <label htmlFor="permission-no">{PTE.NO}</label>
          </div>

          <div
            className="w-max mx-auto flex flex-row items-center justify-center bg-blue-200 px-4 py-1 cursor-pointer text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
            onClick={() => setShowAdditionalOptions(!showAdditionalOptions)}
          >
            {!showAdditionalOptions ? (
              <>
                <p>Show more options</p>
                <MdOutlineKeyboardDoubleArrowDown className="text-2xl ml-1" />
              </>
            ) : (
              <>
                <p>Hide more options</p>
                <MdOutlineKeyboardDoubleArrowUp className="text-2xl ml-1" />
              </>
            )}
          </div>
          {showAdditionalOptions && (
            <>
              <label htmlFor="issueLocation">Issue Location </label>
              <input
                className="rounded px-1 border-solid border-2 border-slate-200 mb-5"
                id="issueLocation"
                type={'text'}
                {...register('issueLocation')}
              />
              <label htmlFor="additionalDetails">Additional Details </label>
              <input
                className="rounded px-1 border-solid border-2 border-slate-200 mb-5"
                id="additionalDetails"
                type={'text'}
                {...register('additionalDetails')}
              />
            </>
          )}
        </div>
        <button
          className="bg-blue-200 p-3 mt-4 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          type="submit"
          disabled={isSubmitting || !isValid || userLoading}
        >
          {isSubmitting ? (
            <LoadingSpinner />
          ) : userLoading ? (
            'Loading user info...'
          ) : (
            'Add Work Order'
          )}
        </button>
      </form>
    </Modal>
  );
};
