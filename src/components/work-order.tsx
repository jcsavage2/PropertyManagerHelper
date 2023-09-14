import { IEvent } from '@/database/entities/event';
import { IWorkOrder } from '@/database/entities/work-order';
import Image from 'next/image';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { toTitleCase, deconstructKey, createdToFormattedDateTime, generateAddressKey, toggleBodyScroll } from '@/utils';
import { ActionMeta, MultiValue } from 'react-select';
import { useUserContext } from '@/context/user';
import { AddCommentModal } from './add-comment-modal';
import AsyncSelect from 'react-select/async';
import { OptionType } from '@/types';
import { AssignTechnicianBody } from '@/pages/api/assign-technician';
import { GoTasklist } from 'react-icons/go';
import { AiOutlineCheck } from 'react-icons/ai';
import { PTE, STATUS } from '@/constants';
import { BsTrashFill } from 'react-icons/bs';
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
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [technicianOptions, setTechnicianOptions] = useState<OptionType[]>([]);
  const [assignedTechnicians, setAssignedTechnicians] = useState<OptionType[]>([]);
  const [loadingAssignedTechnicians, setLoadingAssignedTechnicians] = useState(false);
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
      Modal.setAppElement('#workOrder');
    }
  }, []);

  //Event state
  const [events, setEvents] = useState<Array<IEvent | null>>([]);
  const [eventsStartKey, setEventsStartKey] = useState<StartKey | undefined>(undefined);

  const mapTechnicians = (technicians: any[]): OptionType[] => {
    if (!technicians || technicians.length === 0) return [];
    return technicians.map((technician: any) => {
      return {
        value: technician.email,
        label: technician.name,
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

      setLoadingAssignedTechnicians(true);
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
      setLoadingAssignedTechnicians(false);
    } catch (err) {
      toast.error('Error getting work order. Please try reloading your page', {
        position: toast.POSITION.TOP_CENTER,
        draggable: false,
      });
      console.error(err);
    }
    setIsLoading(false);
  }, [workOrderId, user]);

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
        initialFetch ? setEvents(response.events) : setEvents((prev) => [...prev, ...response.events]);
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
      await getWorkOrderEvents(true);
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
          ksuID: workOrder.GSI1SK, //Pass ksuid from creation time to the assign technician api so we accurately date technician queries
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
        const removedTechnician = actionMeta.removedValue as OptionType;
        await axios.post('/api/remove-technician', {
          workOrderId: deconstructKey(workOrderId),
          pmEmail: user.email,
          pmName: user.name,
          technicianEmail: removedTechnician.value,
          technicianName: removedTechnician.label,
        } as RemoveTechnicianBody);
      }
      await getWorkOrder();
      await getWorkOrderEvents(true);
    } catch (err) {
      console.error(err);
      toast.error('Error assigning or removing Technician. Please Try Again', {
        position: toast.POSITION.TOP_CENTER,
        draggable: false,
      });
    }
    setLoadingAssignedTechnicians(false);
  };

  useEffect(() => {
    const fetchInOrder = async () => {
      if (!workOrderId || !user || !userType) return;
      await getWorkOrder();
      await getWorkOrderEvents(true);
    };
    fetchInOrder();
  }, [workOrderId, user, userType]);

  useEffect(() => {
    async function getImages() {
      if (!workOrder?.images) return;
      const imageKeys = workOrder?.images ?? [];
      const response = await axios.post(`/api/get-images`, { keys: imageKeys });
      setImages(response.data?.images ?? []);
    }
    getImages();
    setImagesLoading(false);
  }, [workOrder?.images]);

  if (workOrder) {
    return (
      <div id="work-order" className="box-border">
        <div className="w-full sticky top-0">
          <div className=" bg-blue-200 text-gray-600 text-center py-2 px-4 text-sm">
            Created on {createdToFormattedDateTime(workOrder.created).join(' @ ')}
            <MdOutlineClear className="float-right my-auto h-6 text-xl text-gray-600 cursor-pointer" onClick={() => handleCloseWorkOrderModal()} />
          </div>
          <div className="flex flex-col w-full align-middle items-center">
            <div className="text-xl my-auto flex flex-row items-center justify-between text-gray-600 w-full p-4  border-b border-slate-200">
              <div className=" flex flex-col">
                {toTitleCase(workOrder?.issue)}
                <div className="text-gray-400 md:text-base text-sm"># {deconstructKey(workOrderId)}</div>
              </div>
              <div className="flex flex-row items-center">
                {!isMobile ? (
                  <>
                    <a
                      href="#wo-modal-comments"
                      className="text-sm bg-white border rounded border-slate-600 px-2 py-1 text-slate-600 hover:bg-slate-300 mr-4"
                    >
                      Go to comments
                    </a>
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
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        {/* WO Modal Content */}

        <div
          style={{ height: isMobile ? `calc(100vh - 285px)` : `calc(100vh - 265px)` }}
          className={`h-max pt-3 px-5 pb-8 overflow-y-scroll flex flex-col box-border text-gray-600 text-md md:text-base`}
        >
          <div className="font-bold">Status</div>
          <div className="flex flex-row mt-0.5">
            {workOrder.status !== STATUS.DELETED ? (
              <>
                <button
                  disabled={isUpdatingStatus}
                  onClick={(e) => !isUpdatingStatus && handleUpdateStatus(e, STATUS.TO_DO)}
                  className={`${
                    workOrder.status === STATUS.TO_DO && 'bg-blue-200'
                  } rounded px-5 py-3 mr-4 border-2 border-slate-300 flex flex-col items-center hover:bg-blue-100 disabled:opacity-25`}
                >
                  <GoTasklist />
                  <span className="text-xs">Todo</span>
                </button>
                <button
                  disabled={isUpdatingStatus}
                  onClick={(e) => !isUpdatingStatus && handleUpdateStatus(e, STATUS.COMPLETE)}
                  className={`${
                    workOrder.status === STATUS.COMPLETE && 'bg-blue-200'
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

          <div className="mt-4 font-bold">Assigned To</div>
          <div className="w-full mt-0.5">
            <AsyncSelect
              placeholder={loadingAssignedTechnicians ? 'Loading...' : assignedTechnicians.length === 0 ? 'Unassigned' : 'Assign technicians...'}
              isDisabled={loadingAssignedTechnicians} // potentially could have logic for technicians to "self assign"
              className={'w-11/12 md:w-10/12 mt-1'}
              closeMenuOnSelect={true}
              isMulti
              defaultOptions={technicianOptions}
              value={assignedTechnicians}
              captureMenuScroll={true}
              loadOptions={(searchString: string) => searchTechnicians(searchString)}
              isLoading={loadingAssignedTechnicians}
              onChange={handleAssignTechnician}
              isClearable={false} //Don't have the functionality for remove all yet
              menuPortalTarget={document.body}
            />
          </div>
          <div className="font-bold mt-4">Photos</div>
          <div className="w-full flex md:gap-x-4 mt-0.5 gap-x-0 pb-2 border-b border-slate-200">
            {imagesLoading ? (
              <LoadingSpinner />
            ) : images && images.length ? (
              images.map((i) => {
                return (
                  <Image
                    key={i + Math.random()}
                    className={`mb-4 mr-2 last:mr-0 md:mx-0 cursor-pointer`}
                    alt={'work order image'}
                    onClick={() => {
                      i === fullScreenImage ? setFullScreenImage('') : setFullScreenImage(i);
                    }}
                    src={i}
                    width={100}
                    height={40}
                  />
                );
              })
            ) : (
              'No photos found'
            )}
          </div>
          <div className="mt-4 font-bold">Permission to Enter</div>
          <div className={`${workOrder.permissionToEnter === PTE.YES ? 'text-green-600' : 'text-red-600'} mt-0.5 font-normal`}>
            {toTitleCase(workOrder.permissionToEnter)}
          </div>
          <div className="font-bold mt-4">{workOrder.address.unit ? 'Unit' : 'Address'}</div>
          <div className="mt-0.5">{toTitleCase(workOrder.address.unit ? workOrder.address.unit : workOrder.address.address)}</div>
          <div className="font-bold mt-4">Tenant</div>
          <div className="mt-0.5">{workOrder.tenantName}</div>
          <div className="font-bold mt-4">Location</div>
          <div className="mt-0.5">{workOrder.location && workOrder.location.length ? workOrder.location : 'None provided'}</div>
          {workOrder.additionalDetails && workOrder.additionalDetails.length > 0 ? (
            <>
              <div className="font-bold mt-4">Additional Info</div>
              <div className="mt-0.5">
                <p>&quot;{workOrder.additionalDetails}&quot;</p>
              </div>
            </>
          ) : null}

          <div className="flex flex-row items-center border-t border-slate-200 pt-2 mt-4">
            <div className="font-bold text-lg">Comments</div>
            <button onClick={() => setOpenAddCommentModal(true)} className="ml-3 rounded px-4 py-0.5 text-sm border bg-blue-200 hover:bg-blue-100">
              Add Comment
            </button>
          </div>

          <div className="w-full" id="wo-modal-comments">
            {events && events.length ? (
              events.map((event: IEvent | null, i: number) => {
                if (event) {
                  const formattedDateTime = createdToFormattedDateTime(event.created!);
                  return (
                    <div
                      key={`${ENTITIES.EVENT}-${i}`}
                      className="mx-auto text-sm text-slate-800 rounded-md bg-gray-200 mt-2 mb-2 last-of-type:mb-0 py-2 px-3 text-left"
                    >
                      <div className="mb-0.5 flex flex-row">
                        <p className="font-bold mr-2">{event.madeByName} </p>
                        <p className="text-slate-600">
                          {formattedDateTime[0]} @ {formattedDateTime[1]}
                        </p>
                      </div>
                      <div className="break-words">{event.message}</div>
                    </div>
                  );
                }
              })
            ) : !isLoadingEvents ? (
              <p className="mt-4 text-center font-bold">Sorry, no comments found</p>
            ) : null}
            {isLoadingEvents ? (
              <LoadingSpinner containerClass="mt-4" />
            ) : events && events.length && eventsStartKey && !isLoadingEvents ? (
              <div className="w-full flex items-center justify-center">
                <button
                  disabled={isLoadingEvents}
                  onClick={() => getWorkOrderEvents(false, eventsStartKey)}
                  className="bg-blue-200 mx-auto py-1 md:w-1/4 w-2/5 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
                >
                  Load more
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="w-full box-border text-sm fixed bottom-0 border-t border-slate-200 md:text-right bg-white text-gray-600 py-4 md:px-6 text-center">
          Created by {workOrder.tenantName} ({workOrder.tenantEmail})
        </div>

        {/* Other modals */}
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
        <AddCommentModal
          addCommentModalIsOpen={openAddCommentModal}
          setAddCommentModalIsOpen={setOpenAddCommentModal}
          workOrderId={workOrderId}
          onSuccessfulAdd={async () => {
            await getWorkOrderEvents(true);
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
