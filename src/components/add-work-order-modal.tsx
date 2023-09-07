import axios from 'axios';
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { OptionType, SendEmailApiRequest } from '@/types';
import { LoadingSpinner } from './loading-spinner/loading-spinner';
import { ITenant } from '@/database/entities/tenant';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';
import { userRoles } from '@/database/entities/user';
import { TenantSelect } from './tenant-select';
import { SingleValue } from 'react-select';
import { GetUser } from '@/pages/api/get-user';
import { ENTITIES } from '@/database/entities';
import { useDevice } from '@/hooks/use-window-size';
import { PTE } from '@/constants';
import { MdOutlineKeyboardDoubleArrowDown, MdOutlineKeyboardDoubleArrowUp } from 'react-icons/md';

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
  const { userType } = useUserContext();
  const { isMobile } = useDevice();
  const [isBrowser, setIsBrowser] = useState(false);
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);

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

  isBrowser && Modal.setAppElement('#workOrder');

  const [tenantEmail, setTenantEmail] = useState<string>('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueLocation, setIssueLocation] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [submitWorkOrderLoading, setSubmitWorkOrderLoading] = useState(false);

  function closeModal() {
    setAddWorkOrderModalIsOpen(false);
  }

  const handleCreateWorkOrder: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      try {
        event.preventDefault();
        if (!user || !user?.email || !user?.name) throw new Error('user must be logged in');
        if (userType !== 'PROPERTY_MANAGER' || !user?.roles?.includes(userRoles.PROPERTY_MANAGER) || !user.organization)
          throw new Error('user must be a property manager in an organization');
        if (!tenantEmail) {
          throw new Error('No tenant selected');
        }
        if (!userType) {
          throw new Error('No userType');
        }
        setSubmitWorkOrderLoading(true);

        //get tenant primary property
        const getTenantResponse = await axios.post('/api/get-user', { email: tenantEmail, userType: ENTITIES.TENANT } as GetUser);
        const tenant = JSON.parse(getTenantResponse.data.response) as ITenant;
        const addressMap: Map<string, any> = tenant.addresses;
        let primaryAddress: any;
        Object.entries(addressMap).forEach((pair) => {
          if (pair[1].isPrimary) {
            primaryAddress = pair[1];
          }
        });

        const body: SendEmailApiRequest = {
          issueDescription,
          issueLocation,
          additionalDetails,
          messages: [],
          pmEmail: user.email,
          creatorEmail: user.email,
          creatorName: user.name,
          createdByType: userType,
          permissionToEnter: PTE.NO,
          address: primaryAddress.address,
          state: primaryAddress.state,
          city: primaryAddress.city,
          postalCode: primaryAddress.postalCode,
          tenantEmail,
          tenantName: tenant.tenantName,
          organization: user.organization,
        };

        const res = await axios.post('/api/create-work-order', body);
        if (res.status !== 200) throw new Error('Error creating and sending WO email');

        toast.success('Successfully Submitted Work Order!', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
        onSuccessfulAdd();
        setIssueDescription('');
        setIssueLocation('');
        setAdditionalDetails('');
        setTenantEmail('');
        setSubmitWorkOrderLoading(false);
      } catch (err) {
        console.log({ err });
        toast.error('Error Submitting Work Order. Please Try Again', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
        setSubmitWorkOrderLoading(false);
      }
    },
    [user, onSuccessfulAdd, setAddWorkOrderModalIsOpen, tenantEmail, issueDescription, issueLocation, additionalDetails]
  );

  const handleIssueDescriptionChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setIssueDescription(e.currentTarget.value);
    },
    [setIssueDescription]
  );
  const handleIssueLocationChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setIssueLocation(e.currentTarget.value);
    },
    [setIssueLocation]
  );
  const handleAdditionalDetailsChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setAdditionalDetails(e.currentTarget.value);
    },
    [setAdditionalDetails]
  );

  return (
    <Modal
      isOpen={addWorkOrderModalIsOpen}
      onAfterOpen={() => {}}
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

      <form onSubmit={handleCreateWorkOrder} className="flex flex-col">
        <div className="flex flex-col mt-4">
          <label htmlFor="issueDescription">What is the issue?* </label>
          <input
            className="rounded px-1 border-solid border-2 border-slate-200 mb-1"
            id="issueDescription"
            type={'text'}
            value={issueDescription}
            onChange={handleIssueDescriptionChange}
          />
          <div className="mb-5">
            <TenantSelect
              label={'Select Tenant*'}
              user={user}
              userType={userType}
              onChange={(option: SingleValue<OptionType>) => {
                if (!option) return;
                setTenantEmail(option.value);
              }}
              shouldFetch={addWorkOrderModalIsOpen}
            />
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
                value={issueLocation}
                onChange={handleIssueLocationChange}
              />
              <label htmlFor="additionalDetails">Additional Details </label>
              <input
                className="rounded px-1 border-solid border-2 border-slate-200 mb-5"
                id="additionalDetails"
                type={'text'}
                value={additionalDetails}
                onChange={handleAdditionalDetailsChange}
              />
            </>
          )}
        </div>

        <button
          className="bg-blue-200 p-3 mt-4 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          type="submit"
          disabled={!issueDescription || !tenantEmail || submitWorkOrderLoading}
        >
          {submitWorkOrderLoading ? <LoadingSpinner /> : 'Add Work Order'}
        </button>
      </form>
    </Modal>
  );
};
