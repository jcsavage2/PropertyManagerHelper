import { IEvent } from '@/database/entities/event';
import { IWorkOrder } from '@/database/entities/work-order';
import Image from 'next/image';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { toTitleCase, deconstructKey, createdToFormattedDateTime, generateAddressKey } from '@/utils';
import { ActionMeta, MultiValue } from 'react-select';
import { useUserContext } from '@/context/user';
import { AddCommentModal } from './add-comment-modal';
import AsyncSelect from 'react-select/async';
import { OptionType } from '@/types';
import { AssignTechnicianBody } from '@/pages/api/assign-technician';
import { GoTasklist } from 'react-icons/go';
import { AiOutlineCheck } from 'react-icons/ai';
import { PTE, STATUS } from '@/constants';
import { BsPersonFill, BsTrashFill } from 'react-icons/bs';
import { IoLocationSharp } from 'react-icons/io5';
import { BiTimeFive } from 'react-icons/bi';
import { LoadingSpinner } from './loading-spinner/loading-spinner';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import ConfirmationModal from './confirmation-modal';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';
import { DeleteRequest } from '@/pages/api/delete';
import { ENTITIES, StartKey } from '@/database/entities';
import { GetTechsForOrgRequest } from '@/pages/api/get-techs-for-org';
import Modal from 'react-modal';
import { userRoles } from '@/database/entities/user';
import { RemoveTechnicianBody } from '@/pages/api/remove-technician';
import { GetWorkOrderEvents } from '@/pages/api/get-work-order-events';
import { GrFormAdd } from 'react-icons/gr';
import { MdOutlineClear } from 'react-icons/md';

const WorkOrder = ({
  workOrderId,
  afterDelete,
  handleCloseWorkOrderModal,
  isMobile,
}: {
  workOrderId: string;
  afterDelete: () => Promise<void>;
  handleCloseWorkOrderModal: () => void;
  isMobile: boolean;
}) => {
  const { user } = useSessionUser();
  const { userType } = useUserContext();
  const router = useRouter();

  const [workOrder, setWorkOrder] = useState<IWorkOrder | null>(null);

  //Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [technicianOptions, setTechnicianOptions] = useState<OptionType[]>([]);
  const [assignedTechnicians, setAssignedTechnicians] = useState<OptionType[]>([]);
  const [loadingAssignedTechnicians, setLoadingAssignedTechnicians] = useState(false);
  const [assignedTechniciansMenuOpen, setAssignedTechniciansMenuOpen] = useState(false);
  const [openAddCommentModal, setOpenAddCommentModal] = useState(false);
  const [confirmDeleteModalIsOpen, setConfirmDeleteModalIsOpen] = useState(false);

  //Photo state
  const [fullScreenImage, setFullScreenImage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState<boolean>(true);

  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  useEffect(() => {
    // Set the app element for accessibility once Modal is loaded
    if (Modal && isBrowser) {
      Modal.setAppElement('#work-order');
    }
  }, []);

  //Event state
  const [events, setEvents] = useState<Array<IEvent | null>>([]);
  const [eventsStartKey, setEventsStartKey] = useState<StartKey | undefined>(undefined);

  const mapTechnicians = (technicians: any[]): OptionType[] => {
    if (!technicians || technicians.length === 0) return [];
    return technicians.map((technician: any) => {
      return {
        value: technician.technicianEmail,
        label: technician.technicianName,
      };
    });
  };

  const getTechnicians = useCallback(async (organization: string, _searchString?: string) => {
    const body: GetTechsForOrgRequest = {
      organization,
      startKey: undefined,
      techSearchString: _searchString,
    };
    const { data } = await axios.post('/api/get-techs-for-org', body);
    const response = JSON.parse(data.response);
    return response;
  }, []);

  //Return a list of technician options based on string search input
  const searchTechnicians = useCallback(
    async (_searchString: string) => {
      if (!user || !userType) return [];
      setLoadingAssignedTechnicians(true);
      try {
        if (
          !user.email ||
          userType !== 'PROPERTY_MANAGER' ||
          !user.roles?.includes(userRoles.PROPERTY_MANAGER) ||
          !user.organization ||
          !_searchString
        ) {
          throw new Error('user must be a property manager in an organization, and there must be a search string');
        }
        const response = await getTechnicians(user.organization, _searchString);
        const mappedTechnicians = mapTechnicians(response.techs);
        setLoadingAssignedTechnicians(false);
        return mappedTechnicians;
      } catch (err) {
        console.log({ err });
      }
      setLoadingAssignedTechnicians(false);
      return [];
    },
    [user, userType, workOrder]
  );

  const getWorkOrder = useCallback(async () => {
    if (!workOrderId || !user || !user.organization) return;
    setIsLoading(true);
    try {
      const { data } = await axios.post('/api/get-work-order', {
        pk: workOrderId,
        sk: workOrderId,
      });
      const _workOrder: IWorkOrder = JSON.parse(data.response);
      setWorkOrder(_workOrder);

      const technicianResponse = await getTechnicians(user.organization);
      const mappedTechnicians = mapTechnicians(technicianResponse.techs);

      setTechnicianOptions(mappedTechnicians);
      setAssignedTechnicians([]);
      if (_workOrder && _workOrder.assignedTo && mappedTechnicians.length > 0) {
        Array.from(_workOrder.assignedTo).forEach((email: string) => {
          const technician: OptionType | undefined = mappedTechnicians.find((technician) => technician.value === email);
          if (technician) {
            setAssignedTechnicians((prev) => [...prev, technician]);
          }
        });
      }
    } catch (err) {
      toast.error('Error getting work order. Please try reloading your page', {
        position: toast.POSITION.TOP_CENTER,
        draggable: false,
      });
      console.error(err);
    }
    setIsLoading(false);
  }, [workOrderId]);

  const getWorkOrderEvents = useCallback(
    async (initialFetch: boolean, startKey?: StartKey) => {
      if (!workOrderId) return;
      setIsLoadingEvents(true);
      try {
        const { data } = await axios.post('/api/get-work-order-events', {
          workOrderId: deconstructKey(workOrderId),
          startKey,
        } as GetWorkOrderEvents);
        const response = JSON.parse(data.response);
        setEvents(initialFetch ? response.events : [...events, response.events]);
        setEventsStartKey(response.startKey);
      } catch (err) {
        console.error(err);
      }
      setIsLoadingEvents(false);
    },
    [workOrderId]
  );

  const handleUpdateStatus = async (e: any, status: string) => {
    if (!workOrderId) return;
    setIsUpdatingStatus(true);
    try {
      if (!user || !user.name || !user.email) {
        throw new Error('User or workOrderId not found');
      }
      const { data } = await axios.post('/api/update-work-order', {
        pk: workOrderId,
        sk: workOrderId,
        status: status,
        email: user.email,
        name: user.name,
      });
      const updatedWorkOrder = JSON.parse(data.response);
      if (updatedWorkOrder) {
        setWorkOrder(updatedWorkOrder);
      }
    } catch (e) {
      console.log(e);
      toast.error('Error updating work order status', {
        position: 'top-right',
        draggable: false,
      });
    }
    setIsUpdatingStatus(false);
  };

  const deleteWorkOrder = useCallback(
    async (workOrderId: string) => {
      if (!workOrderId) return;
      try {
        if (workOrder?.status === STATUS.DELETED || !user || !user.email || !user.name) {
          throw new Error('deleteWorkOrder missing params');
        }
        const params: DeleteRequest = {
          pk: workOrderId,
          sk: workOrderId,
          entity: ENTITIES.WORK_ORDER,
          madeByEmail: user.email,
          madeByName: user.name,
        };
        const { data } = await axios.post('/api/delete', params);
        if (data.response) {
          router.push('/work-orders');
          toast.success('Work Order Deleted!', {
            position: toast.POSITION.TOP_CENTER,
            draggable: false,
          });
          afterDelete();
        }
      } catch (err) {
        console.error(err);
        toast.error('Error Deleting Work Order. Please Try Again', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
      }
    },
    [workOrderId, workOrder, user]
  );

  const handleAssignTechnician = async (_assignedTechnicians: MultiValue<OptionType>, actionMeta: ActionMeta<OptionType>) => {
    setLoadingAssignedTechnicians(true);
    try {
      if (!user?.email || !workOrder || userType !== 'PROPERTY_MANAGER' || !user.organization) {
        throw new Error('User must be a property manager in an organization to assign or remove technicians');
      }
      const actionType = actionMeta.action;
      if (actionType === 'select-option') {
        const selectedTechnician = actionMeta.option as OptionType;
        await axios.post('/api/assign-technician', {
          organization: user.organization,
          workOrderId: deconstructKey(workOrderId),
          pmEmail: user.email,
          pmName: user.name,
          technicianEmail: selectedTechnician.value,
          technicianName: selectedTechnician.label,
          address: workOrder.address,
          status: workOrder.status,
          permissionToEnter: workOrder?.permissionToEnter,
          issueDescription: workOrder?.issue,
        } as AssignTechnicianBody);
      } else if (actionType === 'remove-value') {
        console.log('removing technician');
        const removedTechnician = actionMeta.removedValue as OptionType;
        await axios.post('/api/remove-technician', {
          workOrderId: deconstructKey(workOrderId),
          pmEmail: user.email,
          pmName: user.name,
          technicianEmail: removedTechnician.value,
          technicianName: removedTechnician.label,
        } as RemoveTechnicianBody);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error assigning or removing Technician. Please Try Again', {
        position: toast.POSITION.TOP_CENTER,
        draggable: false,
      });
    }
    setAssignedTechniciansMenuOpen(false);
    setLoadingAssignedTechnicians(false);
    await getWorkOrder();
  };

  useEffect(() => {
    const fetchInOrder = async () => {
      if (!workOrderId || !user || !userType) return;
      await getWorkOrder();
      //if (isMobile) return;
      await getWorkOrderEvents(true);
    };
    fetchInOrder();
  }, [workOrderId, user, userType]);

  //TODO; fix meeeee, move out div and get header outside of loading logic
  if (workOrder) {
    return (
      <div id="work-order" className={'h-full'}>
        <AddCommentModal
          addCommentModalIsOpen={openAddCommentModal}
          setAddCommentModalIsOpen={setOpenAddCommentModal}
          workOrderId={workOrderId}
          onSuccessfulAdd={async () => {
            await getWorkOrder();
          }}
        />
        <ConfirmationModal
          confirmationModalIsOpen={confirmDeleteModalIsOpen}
          setConfirmationModalIsOpen={setConfirmDeleteModalIsOpen}
          onConfirm={() => deleteWorkOrder(workOrderId)}
          childrenComponents={
            <div className="flex flex-col text-center mt-2">
              <div>Are you sure you want to delete this work order?</div>
              <div className="italic mt-2">This action is NOT reversable.</div>
            </div>
          }
        />
        <div className="w-full bg-blue-300 text-gray-600 text-center py-2">
          Created on {createdToFormattedDateTime(workOrder.created).join(' @ ')}
          <MdOutlineClear className="float-right my-auto h-6 text-xl mr-4 text-gray-600 cursor-pointer" onClick={() => handleCloseWorkOrderModal()} />
        </div>
        <div className="flex flex-col w-full align-middle items-center">
          <div className="text-xl my-auto flex flex-row items-center justify-between text-gray-600 w-full p-4  border-b border-slate-200">
            <div className=" flex flex-col">
              {toTitleCase(workOrder?.issue)}
              <div className="hidden md:inline text-base text-gray-400"># {deconstructKey(workOrderId)}</div>
            </div>
            {userType === 'PROPERTY_MANAGER' && workOrder.status !== STATUS.DELETED && (
              <div
                onClick={() => {
                  if (workOrder.status === STATUS.DELETED) return;
                  setConfirmDeleteModalIsOpen(true);
                }}
              >
                <BsTrashFill className="hover:text-red-600 cursor-pointer text-2xl mr-4" />
              </div>
            )}
          </div>
        </div>

        <div
          style={{ height: isMobile ? '38rem' : '25rem' }}
          className={`clear-both overflow-auto p-0 m-0 ${
            isLoadingEvents || isLoadingEvents || assignedTechniciansMenuOpen || (loadingAssignedTechnicians && 'opacity-50')
          }`}
        >
          <div className="flex flex-col w-full items-center justify-start text-gray-600 text-md md:text-base">
            <div className="flex md:flex-row flex-col w-full md:justify-evenly md:items-start items-center mt-2 md:mt-5">
              <div>
                <div className="font-bold text-center md:text-start">Status</div>
                <div className="mt-1 md:ml-4 mx-auto flex flex-row">
                  {workOrder.status !== STATUS.DELETED ? (
                    <>
                      <button
                        disabled={isUpdatingStatus}
                        onClick={(e) => handleUpdateStatus(e, STATUS.TO_DO)}
                        className={`${
                          deconstructKey(workOrder.status) === STATUS.TO_DO && 'bg-blue-200'
                        } rounded px-5 py-3 mr-4 border-2 border-slate-300 flex flex-col items-center hover:bg-blue-100 disabled:opacity-25`}
                      >
                        <GoTasklist />
                        <span className="text-xs">Todo</span>
                      </button>
                      <button
                        disabled={isUpdatingStatus}
                        onClick={(e) => handleUpdateStatus(e, STATUS.COMPLETE)}
                        className={`${
                          deconstructKey(workOrder.status) === STATUS.COMPLETE && 'bg-blue-200'
                        } rounded px-2 py-3 border-2 border-slate-300 flex flex-col items-center hover:bg-blue-100 disabled:opacity-25`}
                      >
                        <AiOutlineCheck />
                        <span className="text-xs">Complete</span>
                      </button>
                    </>
                  ) : (
                    <p className="text-red-600">{STATUS.DELETED}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col md:mt-0 mt-4 md:items-start items-center">
                {!isMobile ? <div className="font-bold mb-1">Other Details</div> : null}
                <div className="flex flex-row items-center ml-4 mb-1">
                  <BsPersonFill className="mr-2" />
                  {workOrder.tenantName}({workOrder.tenantEmail})
                </div>
                <div className="flex flex-row items-center ml-4 mb-1">
                  <IoLocationSharp className="mr-2" />{' '}
                  {generateAddressKey({ address: workOrder?.address?.address, unit: workOrder?.address?.unit ?? '' })}
                </div>
                <div className="flex flex-row items-center ml-4 mb-1">
                  <BiTimeFive className="mr-2" />
                  {createdToFormattedDateTime(workOrder.created).join(' @ ')}
                </div>
              </div>
            </div>
            <div className={`flex md:flex-row flex-col w-full items-center mt-4 md:mt-6 md:justify-evenly`}>
              <div className="">
                <div className="font-bold text-center md:text-left">Location</div>
                <div className="text-center md:text-left md:ml-4">
                  {workOrder.location && workOrder.location.length ? workOrder.location : 'None provided'}
                </div>
              </div>
              <div className="md:mt-0 mt-6">
                <div className="font-bold text-center md:text-left">Additional Info</div>
                <div className="text-center md:text-left md:ml-4">
                  {workOrder.additionalDetails && workOrder.additionalDetails.length > 0 ? (
                    <p>&quot;{workOrder.additionalDetails}&quot;</p>
                  ) : (
                    <p className="italic">None provided</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col font-bold mt-6 md:mt-0 md:ml-12 ml-0">
                <p>Permission to Enter</p>
                <p
                  className={`${
                    workOrder.permissionToEnter === PTE.YES ? 'text-green-600' : 'text-red-600'
                  }  text-center md:text-start font-normal md:ml-4`}
                >
                  {toTitleCase(workOrder.permissionToEnter)}
                </p>
              </div>
            </div>

            <div className="font-bold mt-4 md:mt-6 text-center">Assigned To</div>
            <div className="w-11/12 mt-1 md:mb-2">
              <AsyncSelect
                placeholder={loadingAssignedTechnicians ? 'Loading...' : assignedTechnicians.length === 0 ? 'Unassigned' : 'Assign technicians...'}
                isDisabled={userType !== 'PROPERTY_MANAGER'} // potentially could have logic for technicians to "self assign"
                className={'md:w-9/12 w-full mt-1 mx-auto'}
                closeMenuOnSelect={false}
                isMulti
                defaultOptions={technicianOptions}
                value={assignedTechnicians}
                captureMenuScroll={true}
                loadOptions={(searchString: string) => searchTechnicians(searchString)}
                isLoading={loadingAssignedTechnicians}
                onChange={handleAssignTechnician}
                isClearable={false}
                onMenuOpen={() => setAssignedTechniciansMenuOpen(true)}
                onMenuClose={() => setAssignedTechniciansMenuOpen(false)}
                menuPortalTarget={document.body}
              />
            </div>
          </div>
          <div className="w-full flex flex-col justify-center items-center">
            {events && events.length ? (
              events.map((event: IEvent | null, i: number) => {
                if (event) {
                  const formattedDateTime = createdToFormattedDateTime(event.created!);
                  return (
                    <div
                      key={`${ENTITIES.EVENT}-${i}`}
                      className="mx-auto text-gray-800 md:w-9/12 w-11/12 rounded-md bg-gray-200 mt-2 mb-2 py-2 px-4 text-left"
                    >
                      <div className="text-sm text-gray-500">
                        {event.madeByName} ({event.madeByEmail})
                      </div>
                      <div className="text-sm text-gray-500 mb-1">
                        {formattedDateTime[0]} @ {formattedDateTime[1]}
                      </div>
                      <div className="break-words">{event.message}</div>
                    </div>
                  );
                }
              })
            ) : (
              <p className="mt-4 text-center font-bold">Sorry, no comments found</p>
            )}
          </div>
        </div>
        <Modal
          isOpen={!!fullScreenImage}
          onRequestClose={() => setFullScreenImage('')}
          contentLabel="Image Modal"
          overlayClassName="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center"
          className="w-full h-full"
        >
          <div className="overflow-y-scroll" style={{ width: '100%', height: '100%' }}>
            <Image
              src={fullScreenImage}
              alt="Description"
              className="w-full cursor-pointer my-auto overflow-y-scroll"
              onClick={() => setFullScreenImage('')}
              width={100}
              height={40}
            />
          </div>
        </Modal>
      </div>
    );
  }
  if (isLoading) {
    return <LoadingSpinner containerClass="mt-6" />;
  }
  return (
    <div>
      <div className="w-full flex items-center justify-center font-bold mt-8">Work order not found.</div>
    </div>
  );
};

export default WorkOrder;
