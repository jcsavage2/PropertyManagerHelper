import axios from 'axios';
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import Modal from 'react-modal';
import { SingleValue } from 'react-select';
import { StateSelect } from './state-select';
import { useDevice } from '@/hooks/use-window-size';
import { OptionType } from '@/types';
import { toast } from 'react-toastify';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';
import { userRoles } from '@/database/entities/user';
import { TenantSelect } from './tenant-select';
import { LoadingSpinner } from './loading-spinner/loading-spinner';
import { toggleBodyScroll } from '@/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import { API_STATUS, USER_PERMISSION_ERROR, defaultProperty } from '@/constants';
import { validateProperty, lowerCaseRequiredEmail } from '@/types/zodvalidators';

export const CreatevalidateProperty = z.union([
  validateProperty,
  z.object({ tenantEmail: lowerCaseRequiredEmail, organization: z.string().min(1), pmEmail: lowerCaseRequiredEmail }),
]);
export type CreatevalidatePropertyType = z.infer<typeof CreatevalidateProperty>;

export const AddPropertyModal = ({
  addPropertyModalIsOpen,
  setAddPropertyModalIsOpen,
  onSuccess,
}: {
  addPropertyModalIsOpen: boolean;
  setAddPropertyModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onSuccess: () => Promise<void>;
}) => {
  const [isBrowser, setIsBrowser] = useState(false);
  const { user } = useSessionUser();
  const { isMobile } = useDevice();
  const { userType } = useUserContext();

  useEffect(() => {
    setIsBrowser(true);
  }, []);
  isBrowser && Modal.setAppElement('#testing');

  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      width: isMobile ? '90%' : '50%',
      transform: 'translate(-50%, -50%)',
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

  function closeModal() {
    reset();
    setAddPropertyModalIsOpen(false);
  }

  const handleCreateNewProperty: SubmitHandler<CreatevalidatePropertyType> = useCallback(
    async (params) => {
      try {
        if (userType !== userRoles.PROPERTY_MANAGER || !user?.roles?.includes(userRoles.PROPERTY_MANAGER)) {
          throw new Error(USER_PERMISSION_ERROR);
        }
        const res = await axios.post('/api/create-property', params);
        if (res.status !== API_STATUS.SUCCESS) throw new Error(res.data.response);

        toast.success('Property Created!', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
        closeModal();
        onSuccess();
      } catch (err: any) {
        console.log({ err });
        toast.error('Error Creating Property. Please Try Again', {
          draggable: false,
          position: toast.POSITION.TOP_CENTER,
        });
      }
    },
    [user, userType]
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isValid },
    control,
    reset,
  } = useForm<CreatevalidatePropertyType>({ resolver: zodResolver(CreatevalidateProperty), defaultValues: defaultProperty });

  return (
    <div>
      <Modal
        isOpen={addPropertyModalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Create Property Modal"
        closeTimeoutMS={200}
        style={customStyles}
        onAfterClose={() => toggleBodyScroll(false)}
        onAfterOpen={() => toggleBodyScroll(true)}
      >
        <div className="w-full text-right">
          <button className="bg-blue-200 px-2 py-1 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" onClick={closeModal}>
            X Close
          </button>
        </div>

        <form onSubmit={handleSubmit(handleCreateNewProperty)} style={{ display: 'grid' }}>
          <label htmlFor="address">Address* </label>
          <input
            className="rounded px-1 border-solid border-2 border-slate-200 text-gray-600"
            placeholder="123 some street"
            id="address"
            type={'text'}
            {...register('address')}
          />
          <label htmlFor="unit">Unit </label>
          <input className="rounded px-1 border-solid border-2 border-slate-200" id="unit" placeholder="1704" type={'text'} {...register('unit')} />
          <Controller
            control={control}
            name="state"
            render={({ field: { onChange, value } }) => <StateSelect state={value} setState={onChange} label={'State*'} placeholder="Select..." />}
          />
          <label htmlFor="address">City*</label>
          <input
            className="rounded px-1 border-solid border-2 border-slate-200"
            id="address"
            type={'text'}
            placeholder="Springfield"
            {...register('city')}
          />
          <label htmlFor="address">Zip* </label>
          <input
            className="rounded px-1 border-solid border-2 border-slate-200"
            id="address"
            type={'text'}
            {...register('postalCode')}
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
              {...register('numBeds')}
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
              {...register('numBaths')}
            />
          </div>

          <Controller
            control={control}
            name="tenantEmail"
            render={({ field: { onChange, value } }) => (
              <TenantSelect
                label={'Optionally attach an existing tenant to this property'}
                user={user}
                userType={userType}
                onChange={(option: SingleValue<OptionType>) => onChange(option?.value ?? undefined)}
                shouldFetch={addPropertyModalIsOpen}
              />
            )}
          />
          <input type="hidden" {...register('organization')} value={user?.organization ?? ''} />
          <input type="hidden" {...register('pmEmail')} value={user?.email ?? ''} />
          <button
            className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
            type="submit"
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? <LoadingSpinner /> : 'Add Property'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
