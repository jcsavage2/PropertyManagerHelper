import { IEvent } from '@/database/entities/event';
import { IWorkOrder } from '@/database/entities/work-order';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { toTitleCase, deconstructKey, createdToFormattedDateTime, generateAddressKey } from '@/utils';
import { ActionMeta, MultiValue } from 'react-select';
import { useUserContext } from '@/context/user';
import { AddCommentModal } from './add-comment-modal';
import AsyncSelect from 'react-select/async';
import { EventType, OptionType } from '@/types';
import { AssignTechnicianBody } from '@/pages/api/assign-technician';
import { GoTasklist } from 'react-icons/go';
import { AiOutlineCheck } from 'react-icons/ai';
import { EVENTS, PTE, STATUS } from '@/constants';
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
import { userRoles } from '@/database/entities/user';
import { useDevice } from '@/hooks/use-window-size';
import { RemoveTechnicianBody } from '@/pages/api/remove-technician';
import { GetWorkOrderEvents } from '@/pages/api/get-work-order-events';
import { GrFormAdd } from 'react-icons/gr';

const WorkOrder = ({
  workOrderId,
  afterDelete,
  handleCloseWorkOrderModal,
  isMobile,
}: {
  workOrderId: string;
  afterDelete: () => Promise<void>;
  handleCloseWorkOrderModal: () => {};
  isMobile: boolean;
}) => {
  type WorkOrderTabsType = 'DETAILS' | EventType;
  const TABS = {
    ...EVENTS,
    DETAILS: 'DETAILS',
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [workOrder, setWorkOrder] = useState<IWorkOrder | null>(null);
  const [technicianOptions, setTechnicianOptions] = useState<OptionType[]>([]);
  const [assignedTechnicians, setAssignedTechnicians] = useState<OptionType[]>([]);
  const [loadingAssignedTechnicians, setLoadingAssignedTechnicians] = useState(false);
  const [assignedTechniciansMenuOpen, setAssignedTechniciansMenuOpen] = useState(false);
  const { user } = useSessionUser();
  const { userType } = useUserContext();
  const router = useRouter();
  const [openAddCommentModal, setOpenAddCommentModal] = useState(false);
  const [confirmDeleteModalIsOpen, setConfirmDeleteModalIsOpen] = useState(false);

  //Event tab state
  const [eventTab, setEventTab] = useState<WorkOrderTabsType>(isMobile ? TABS.DETAILS : TABS.CHAT);
  const [chatEvents, setChatEvents] = useState<Array<IEvent | null>>([]);
  const [updateEvents, setUpdateEvents] = useState<Array<IEvent | null>>([]);
  const [commentEvents, setCommentEvents] = useState<Array<IEvent | null>>([]);
  const [chatStartKey, setChatStartKey] = useState<StartKey | undefined>(undefined);
  const [updateStartKey, setUpdateStartKey] = useState<StartKey | undefined>(undefined);
  const [commentStartKey, setCommentStartKey] = useState<StartKey | undefined>(undefined);

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
    async (initialFetch: boolean, type: EventType, startKey?: StartKey) => {
      if (!workOrderId) return;
      setIsLoadingEvents(true);
      setEventTab(type);
      try {
        const { data } = await axios.post('/api/get-work-order-events', {
          workOrderId: deconstructKey(workOrderId),
          type,
          startKey,
        } as GetWorkOrderEvents);
        const response = JSON.parse(data.response);
        switch (type) {
          case EVENTS.CHAT:
            const unsortedChat = initialFetch ? response.events : [...chatEvents, response.events];
            const sortedChat = unsortedChat.sort((a: IEvent, b: IEvent) => {
              if (a?.created && b?.created) {
                //@ts-ignore
                return new Date(a.created) - new Date(b.created);
              } else {
                return 0;
              }
            });
            setChatEvents(sortedChat);
            setChatStartKey(response.startKey);
            break;
          case EVENTS.UPDATE:
            initialFetch ? setUpdateEvents(response.events) : setUpdateEvents((prev) => [...prev, response.events]);
            setUpdateStartKey(response.startKey);
            break;
          case EVENTS.COMMENT:
            initialFetch ? setCommentEvents(response.events) : setCommentEvents((prev) => [...prev, response.events]);
            setCommentStartKey(response.startKey);
            break;
        }
      } catch (err) {
        toast.error('Error getting work order events', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
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
    eventTab === TABS.UPDATE && (await getWorkOrderEvents(true, TABS.UPDATE, undefined));
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
      //Delete will close the WO modal so no need to fetch UPDATE events
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
    eventTab === TABS.UPDATE && (await getWorkOrderEvents(true, TABS.UPDATE, undefined));
  };

  useEffect(() => {
    const fetchInOrder = async () => {
      if (!workOrderId || !user || !userType) return;
      await getWorkOrder();
      if (isMobile) return;
      //Only need to load the chat events initially
      await getWorkOrderEvents(true, TABS.CHAT, undefined);
    };
    fetchInOrder();
  }, [workOrderId, user, userType]);

  const renderChatEvents = () => {
    return (
      <div className="flex flex-col items-center justify-center pt-2">
        {chatEvents && chatEvents.length ? (
          chatEvents.map((event: IEvent | null, i: number) => {
            if (event) {
              const formattedDateTime = createdToFormattedDateTime(event.created);
              return (
                <div
                  className={`text-gray-600 md:w-10/12 w-11/12 text-sm md:text-md rounded-md py-2 px-4 mb-2 ${!!(i % 2) ? 'bg-gray-200 text-left' : 'bg-blue-100 text-right'}`}
                  key={`${TABS.CHAT}-${i}`}
                >
                  <p className="">
                    {event.madeByName !== 'Pillar Assistant' ? (
                      <>
                        {event.madeByName} ({event.madeByEmail})
                      </>
                    ) : (
                      <>{event.madeByName}</>
                    )}
                  </p>
                  <div className="text-sm mb-1">
                    {formattedDateTime[0]} @ {formattedDateTime[1]}
                  </div>
                  <p className="text-black whitespace-pre-line break-keep italic">&quot;{event.message}&quot;</p>
                </div>
              );
            }
          })
        ) : (
          <p className="mt-4 text-center font-bold">Sorry, no chat history found</p>
        )}
      </div>
    );
  };

  const renderUpdateEvents = () => {
    return (
      <div className="flex flex-col items-center justify-center">
        {updateEvents && updateEvents.length ? (
          updateEvents.map((event: IEvent | null, i: number) => {
            if (event) {
              const formattedDateTime = createdToFormattedDateTime(event.created);
              return (
                <div
                  key={`${TABS.UPDATE}-${i}`}
                  className="mx-auto text-sm text-gray-800 md:w-9/12 w-11/12 rounded-md bg-gray-200 mt-2 mb-2 py-2 px-4 text-left"
                >
                  <div className=" text-gray-500">
                    {event.madeByName} ({event.madeByEmail})
                  </div>
                  <div className=" text-gray-500 mb-1">
                    {formattedDateTime[0]} @ {formattedDateTime[1]}
                  </div>
                  <div className="break-words font-bold">{event.message}</div>
                </div>
              );
            }
          })
        ) : (
          <p className="mt-4 text-center font-bold">Sorry, no event history found</p>
        )}
      </div>
    );
  };

  const renderCommentEvents = () => {
    return (
      <div className="w-full flex flex-col justify-center items-center">
        {commentEvents && commentEvents.length ? (
          commentEvents.map((event: IEvent | null, i: number) => {
            if (event) {
              const formattedDateTime = createdToFormattedDateTime(event.created);
              return (
                <div key={`${TABS.COMMENT}-${i}`} className="mx-auto text-gray-800 md:w-9/12 w-11/12 rounded-md bg-gray-200 mt-2 mb-2 py-2 px-4 text-left">
                  <div className="text-sm text-gray-500">
                    {event.madeByName} ({event.madeByEmail})
                  </div>
                  <div className="text-sm text-gray-500 mb-1">
                    {formattedDateTime[0]} @ {formattedDateTime[1]}
                  </div>
                  <div className="break-words italic">&quot;{event.message}&quot;</div>
                </div>
              );
            }
          })
        ) : (
          <p className="mt-4 text-center font-bold">Sorry, no comments found</p>
        )}
      </div>
    );
  };

  const renderAssignedToSelect = () => {
    return (
      <>
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
      </>
    );
  };

  const renderDetails = (workOrder: IWorkOrder) => {
    return (
      <div className="flex flex-col w-full items-center justify-start text-gray-600 text-md md:text-base">
        {isMobile ? <div className="text-md mt-2 text-center text-gray-400"># {deconstructKey(workOrderId)}</div> : null}
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
        {isMobile ? renderAssignedToSelect() : null}
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

        {!isMobile ? renderAssignedToSelect() : null}
      </div>
    );
  };

  const renderTabs = () => {
    return (
      <div
        className={`flex flex-row md:mt-4 mt-3 justify-center items-center text-slate-600 w-full ${
          isLoadingEvents || assignedTechniciansMenuOpen || (loadingAssignedTechnicians && 'opacity-50')
        } ${isMobile ? 'text-sm' : 'text-base'}`}
      >
        {isMobile && (
          <button
            className={`bg-blue-200 ${
              eventTab === TABS.DETAILS && 'bg-blue-300'
            } border-slate-300 md:w-36 text-center border border-b-0 border-r-0 md:hover:bg-blue-100  md:px-4 px-2 py-1 rounded-tl cursor-pointer`}
            onClick={() => !assignedTechniciansMenuOpen && !isLoadingEvents && !isLoading && setEventTab(TABS.DETAILS)}
            disabled={isLoadingEvents}
          >
            Details
          </button>
        )}
        <button
          className={`bg-blue-200 ${eventTab === TABS.CHAT && 'bg-blue-300'} rounded-tl ${
            isMobile && 'rounded-tl-none'
          } border-slate-300 md:w-36 text-center border border-b-0 md:hover:bg-blue-100 md:px-4 px-2 py-1 cursor-pointer`}
          onClick={() => !assignedTechniciansMenuOpen && !isLoadingEvents && !isLoading && getWorkOrderEvents(true, TABS.CHAT, undefined)}
          disabled={isLoadingEvents}
        >
          Chats
        </button>
        <button
          className={`bg-blue-200 ${
            eventTab === TABS.UPDATE && 'bg-blue-300'
          } border-slate-300 md:w-36 text-center border-t md:hover:bg-blue-100 md:px-4 px-2 py-1 cursor-pointer`}
          onClick={() => !assignedTechniciansMenuOpen && !isLoadingEvents && !isLoading && getWorkOrderEvents(true, TABS.UPDATE, undefined)}
          disabled={isLoadingEvents}
        >
          Events
        </button>
        <button
          className={`bg-blue-200 ${
            eventTab === TABS.COMMENT && 'bg-blue-300'
          } border-slate-300 md:w-36 text-center mr-4 border border-b-0 md:hover:bg-blue-100 md:px-4 px-2 py-1 rounded-tr cursor-pointer`}
          onClick={() => !assignedTechniciansMenuOpen && !isLoadingEvents && !isLoading && getWorkOrderEvents(true, TABS.COMMENT, undefined)}
          disabled={isLoadingEvents}
        >
          Comments
        </button>
        <button
          className="flex flex-row align-middle items-center justify-center border-slate-400 border md:justify-self-end bg-blue-200 text-gray-600 md:hover:bg-blue-300 md:mx-0 rounded disabled:opacity-25 h-6 md:h-7 md:w-32 w-6"
          onClick={() => !assignedTechniciansMenuOpen && !isLoadingEvents && !isLoading && setOpenAddCommentModal(true)}
          disabled={assignedTechniciansMenuOpen || isLoadingEvents || isLoading || loadingAssignedTechnicians}
        >
          {isMobile ? <GrFormAdd /> : 'Add Comment'}
        </button>
      </div>
    );
  };

  if (workOrder && !isLoading) {
    return (
      <div id="work-order" className={'h-full'}>
        <AddCommentModal
          addCommentModalIsOpen={openAddCommentModal}
          setAddCommentModalIsOpen={setOpenAddCommentModal}
          workOrderId={workOrderId}
          onSuccessfulAdd={async () => {
            await getWorkOrder();
            eventTab === TABS.COMMENT && (await getWorkOrderEvents(true, TABS.COMMENT, undefined));
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
        <div className="flex flex-col w-full align-middle items-center">
          <div className="md:text-3xl text-xl my-auto flex flex-row items-center justify-between text-gray-600 w-full p-3 pb-0">
            <div className="md:ml-4 flex flex-col">
              {toTitleCase(workOrder?.issue)}
              <div className="hidden md:inline text-lg text-gray-400"># {deconstructKey(workOrderId)}</div>
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
          {!isMobile ? <hr className="w-full mt-2 mb-1" /> : null}
          <div className="w-full">{!isMobile ? renderDetails(workOrder) : null}</div>
        </div>
        {renderTabs()}

        <div
          style={{ height: isMobile ? '38rem' : '25rem' }}
          className={`clear-both ${isMobile ? 'border-t rounded-none border-slate-300' : 'border rounded border-slate-300'}  overflow-auto p-0 m-0 ${
            isLoadingEvents || isLoadingEvents || assignedTechniciansMenuOpen || (loadingAssignedTechnicians && 'opacity-50')
          }`}
        >
          {isLoadingEvents ? (
            <LoadingSpinner containerClass="mt-8" />
          ) : eventTab === TABS.CHAT ? (
            renderChatEvents()
          ) : eventTab === TABS.UPDATE ? (
            renderUpdateEvents()
          ) : eventTab === TABS.COMMENT ? (
            renderCommentEvents()
          ) : (
            renderDetails(workOrder)
          )}
        </div>
      </div>
    );
  }
  if (isLoading) {
    return <LoadingSpinner containerClass="mt-6" />;
  }
  return (
    <div>
      <div>None</div>
    </div>
  );
};

export default WorkOrder;
