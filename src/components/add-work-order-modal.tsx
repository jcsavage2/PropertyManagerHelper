import axios from 'axios';
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { OptionType } from '@/types';
import { LoadingSpinner } from './loading-spinner/loading-spinner';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';
import { IUser, userRoles } from '@/database/entities/user';
import { TenantSelect } from './tenant-select';
import { SingleValue } from 'react-select';
import { GetUser } from '@/pages/api/get-user';
import { ENTITIES } from '@/database/entities';
import { useDevice } from '@/hooks/use-window-size';
import { PTE, USER_PERMISSION_ERROR } from '@/constants';
import { MdOutlineKeyboardDoubleArrowDown, MdOutlineKeyboardDoubleArrowUp } from 'react-icons/md';
import { toggleBodyScroll } from '@/utils';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateWorkOrderFullSchema } from '@/pages/work-order-chatbot';
import { PropertyType, optionalString, lowerCaseRequiredEmail, requiredString, validatePTE } from '@/types/zodvalidators';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const AddWorkOrderModalSchema = z.object({
  issueDescription: requiredString,
  tenantEmail: lowerCaseRequiredEmail,
  permissionToEnter: validatePTE,
  issueLocation: optionalString,
  additionalDetails: optionalString,
});
export type AddWorkOrderModalSchemaType = z.infer<typeof AddWorkOrderModalSchema>;

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
    formState: { isSubmitting, isValid },
  } = useForm<AddWorkOrderModalSchemaType>({
    resolver: zodResolver(AddWorkOrderModalSchema),
  });

  function closeModal() {
    setAddWorkOrderModalIsOpen(false);
    reset();
    setShowAdditionalOptions(false);
  }

  const handleCreateWorkOrder: SubmitHandler<AddWorkOrderModalSchemaType> = useCallback(
    async (params) => {
      try {
        if (userType !== userRoles.PROPERTY_MANAGER || !user?.roles?.includes(userRoles.PROPERTY_MANAGER)) throw new Error(USER_PERMISSION_ERROR);

        //Fetch additional tenant info
        const getTenantResponse = await axios.post('/api/get-user', { email: params.tenantEmail, userType: ENTITIES.TENANT } as GetUser);
        if (getTenantResponse.status !== 200) throw new Error('Error getting tenant');

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
        } as PropertyType;

        const validatedBody = CreateWorkOrderFullSchema.parse({
          ...params,
          organization: user?.organization ?? '',
          pmEmail: user?.email ?? '',
          pmName: altName ?? user?.name ?? '',
          creatorEmail: user?.email ?? '',
          creatorName: altName ?? user?.name ?? '',
          woId: uuidv4(),
          createdByType: userType ?? '',
          tenantName: tenant.name,
          property,
        });
        console.log(validatedBody)
        const res = await axios.post('/api/create-work-order', { ...validatedBody });
        if (res.status !== 200) throw new Error(res.data.response);

        toast.success('Successfully Submitted Work Order!', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
        onSuccessfulAdd();
        closeModal();
      } catch (err) {
        console.log({ err });
        toast.error('Error Submitting Work Order. Please Try Again', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
      }
    },
    [user, userType, altName, onSuccessfulAdd]
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
        <button className="float-right bg-blue-200 px-2 py-1 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" onClick={closeModal}>
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
            {...register("issueDescription")}
          />
          <div className="mb-5">
            <Controller
              control={control}
              name="tenantEmail"
              render={({ field: { onChange, value } }) => (
                <TenantSelect
                  label={'Optionally attach an existing tenant to this property'}
                  user={user}
                  userType={userType}
                  onChange={async (option: SingleValue<OptionType>) => {
                    onChange(option?.value ?? undefined);
                  }}
                  shouldFetch={addWorkOrderModalIsOpen}
                />
              )}
            />
          </div>
          <div className="mb-5">
            <p className="mt-2">Permission To Enter Property* </p>
            <input className="rounded px-1" id="permission-yes" type={'radio'} value={PTE.YES} {...register('permissionToEnter')} />
            <label htmlFor="permission-yes">{PTE.YES}</label>
            <input className="rounded px-1 ml-4" id="permission-no" type={'radio'} value={PTE.NO} {...register('permissionToEnter')} />
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
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? <LoadingSpinner /> : 'Add Work Order'}
        </button>
      </form>
    </Modal>
  );
};
