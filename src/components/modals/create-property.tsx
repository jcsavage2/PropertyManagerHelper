import axios from 'axios';
import { useCallback } from 'react';
import { SingleValue } from 'react-select';
import { StateSelect } from '../dropdowns/state-select';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';
import { USER_TYPE } from '@/database/entities/user';
import { TenantSelect } from '../dropdowns/tenant-select';
import { LoadingSpinner } from '../loading-spinner';
import { renderToastError, renderToastSuccess } from '@/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { USER_PERMISSION_ERROR, DEFAULT_PROPERTY } from '@/constants';
import { CreatePropertySchema } from '@/types/customschemas';
import Modal from './modal';
import { CreateProperty, Option } from '@/types';
import { useDocument } from '@/hooks/use-document';

const modalId = 'create-property-modal';

export const CreatePropertyModal = ({ onSuccess }: { onSuccess: () => Promise<void> }) => {
  const { user } = useSessionUser();
  const { userType, altName } = useUserContext();
  const {clientDocument} = useDocument();

  function closeModal() {
    (clientDocument?.getElementById(modalId) as HTMLFormElement)?.close();
    reset();
  }

  const handleCreateNewProperty: SubmitHandler<CreateProperty> = useCallback(
    async (params) => {
      try {
        if (userType !== USER_TYPE.PROPERTY_MANAGER || !user?.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
          throw new Error(USER_PERMISSION_ERROR);
        }

        const { data } = await axios.post('/api/get-properties-by-address', {
          organization: user?.organization,
          property: {
            address: params.address,
            unit: params.unit,
            city: params.city,
            state: params.state,
            postalCode: params.postalCode,
          },
        });

        const properties = JSON.parse(data.response).properties;
        if (properties.length > 0) {
          renderToastError(null, 'Property already exists', modalId);
          return;
        }

        await axios.post('/api/create-property', params);

        renderToastSuccess('Property Created!');
        closeModal();
        onSuccess();
      } catch (err: any) {
        console.log({ err });
        renderToastError(err, 'Error creating property', modalId);
      }
    },
    [user, userType]
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isValid, errors },
    control,
    reset,
  } = useForm<CreateProperty>({
    resolver: zodResolver(CreatePropertySchema),
    defaultValues: DEFAULT_PROPERTY,
    mode: 'all',
  });

  return (
    <Modal id={modalId} openButtonText="+ Property" onClose={closeModal} title="Create Property">
      <form onSubmit={handleSubmit(handleCreateNewProperty)} style={{ display: 'grid' }}>
        <div className="label">
          <span className="label-text">Address*</span>
        </div>
        <input
          className="input input-sm input-bordered"
          placeholder="123 some street"
          id="address"
          type={'text'}
          {...register('address', {
            required: true,
          })}
        />
        {errors.address && <p className="text-error text-xs mt-1 italic">{errors.address.message}</p>}
        <div className="label">
          <span className="label-text">Unit </span>
        </div>
        <input className="input input-sm input-bordered" id="unit" placeholder="1704" type={'text'} {...register('unit')} />
        <Controller
          control={control}
          name="state"
          render={({ field: { onChange, value } }) => <StateSelect state={value} setState={onChange} label={'State*'} placeholder="Select..." />}
        />
        {errors.state && <p className="text-error text-xs mt-1 italic">{errors.state.message}</p>}
        <div className="label">
          <span className="label-text">City*</span>
        </div>
        <input
          className="input input-sm input-bordered"
          id="city"
          type={'text'}
          placeholder="Springfield"
          {...register('city', {
            required: true,
          })}
        />
        {errors.city && <p className="text-error text-xs mt-1 italic">{errors.city.message}</p>}
        <div className="label">
          <span className="label-text">Postal Code*</span>
        </div>
        <input
          className="input input-sm input-bordered"
          id="postalCode"
          type={'text'}
          {...register('postalCode', {
            required: true,
          })}
          placeholder="000000"
        />
        {errors.postalCode && <p className="text-error text-xs mt-1 italic">{errors.postalCode.message}</p>}
        <div className={`flex flex-row w-5/6 mt-2 mb-2 items-center sm:w-full`}>
          <div className="label">
            <span className="label-text">Beds*</span>
          </div>
          <input className="input input-sm input-bordered mr-auto" type="number" id="beds" step={1} min={1} max={10} {...register('numBeds')} />
          <div className="label">
            <span className="label-text">Baths*</span>
          </div>
          <input className="input input-sm input-bordered mr-auto" type="number" id="baths" min={1} max={10} step={0.5} {...register('numBaths')} />
        </div>

        <Controller
          control={control}
          name="tenantEmail"
          render={({ field: { onChange, value } }) => (
            <TenantSelect
              label={'Optionally attach an existing tenant to this property'}
              user={user}
              userType={userType}
              onChange={(option: SingleValue<Option>) => onChange(option?.value ?? undefined)}
              modalTarget={modalId}
            />
          )}
        />
        <input type="hidden" {...register('organization')} value={user?.organization ?? ''} />
        <input type="hidden" {...register('pmEmail')} value={user?.email ?? ''} />
        <input type="hidden" {...register('pmName')} value={altName ?? user?.name ?? ''} />
        <button className="btn btn-primary mt-4" type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting ? <LoadingSpinner /> : 'Add Property'}
        </button>
      </form>
    </Modal>
  );
};
