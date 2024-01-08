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
        if (!user || userType !== USER_TYPE.PROPERTY_MANAGER || !user?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) throw new Error(USER_PERMISSION_ERROR);

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
        <button className="float-right btn btn-sm btn-secondary" onClick={closeModal}>
          X
        </button>
        <p className="clear-left text-lg md:w-2/5 mx-auto pt-0.5">Create New Work Order</p>
      </div>

      <form onSubmit={handleSubmit(handleCreateWorkOrder)} className="flex flex-col">
        <div className="flex flex-col mt-4">
          <div className="label">
            <span className="label-text">What is the issue?*</span>
          </div>
          <input className="input input-sm input-bordered" id="issueDescription" type={'text'} {...register('issueDescription', { required: true })} />
          {errors.issueDescription && <p className="text-error text-xs mt-1">{errors.issueDescription.message}</p>}
          <div className="mb-3">
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
            {errors.tenantEmail && <p className="text-error text-xs mt-1">{errors.tenantEmail.message}</p>}
          </div>
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
              <button className="bg-accent btn btn-sm">{showAdditionalOptions ? 'Hide options' : 'Show more options'}</button>
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
        </div>
        <button className="btn mt-3 btn-primary" type="submit" disabled={isSubmitting || !isValid || userLoading}>
          {isSubmitting ? <LoadingSpinner /> : userLoading ? 'Loading user info...' : 'Add Work Order'}
        </button>
      </form>
    </Modal>
  );
};
