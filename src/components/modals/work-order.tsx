import { IEvent } from '@/database/entities/event';
import { IWorkOrder } from '@/database/entities/work-order';
import Image from 'next/image';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { toTitleCase, deconstructKey, createdToFormattedDateTime, deconstructNameEmailString, constructNameEmailString, renderToastError, renderToastSuccess } from '@/utils';
import Select, { ActionMeta, MultiValue } from 'react-select';
import { useUserContext } from '@/context/user';
import { AddCommentModal } from './add-comment';
import AsyncSelect from 'react-select/async';
import { AssignRemoveTechnician, DeleteWorkOrder, Option, PTE_Type, UpdateViewedWORequest, UpdateWorkOrder } from '@/types';
import { GoTasklist } from 'react-icons/go';
import { AiOutlineCheck } from 'react-icons/ai';
import { API_STATUS, PTE, WO_STATUS, TECHNICIAN_DELIM, USER_PERMISSION_ERROR } from '@/constants';
import { BsTrashFill } from 'react-icons/bs';
import { LoadingSpinner } from '../loading-spinner';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import ConfirmationModal from './confirmation';
import { useRouter } from 'next/router';
import { ENTITIES, StartKey } from '@/database/entities';
import { USER_TYPE } from '@/database/entities/user';
import { UpdateWorkOrderSchema } from '@/types/customschemas';
import { useDevice } from '@/hooks/use-window-size';
import Modal from '../modal';
import LargeModalSkeleton from '../skeletons/large-modal';
import MobileCard from '../mobile-card';
import { useDocument } from '@/hooks/use-document';

const modalId = 'work-order-modal';

const PTEOptions: { value: PTE_Type; label: PTE_Type }[] = [
  { value: PTE.YES, label: PTE.YES },
  { value: PTE.NO, label: PTE.NO },
];

const WorkOrderModal = ({ isOpen, workOrderId, afterDelete, onClose }: { isOpen: boolean; workOrderId: string; afterDelete: () => Promise<void>; onClose: () => void }) => {
  const { user } = useSessionUser();
  const { userType, altName } = useUserContext();
  const router = useRouter();
  const { isMobile } = useDevice();
  const {clientDocument} = useDocument();

  const [workOrder, setWorkOrder] = useState<IWorkOrder | null>(null);

  //Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPTE, setIsUpdatingPTE] = useState(false);
  const [fetchingTechnicians, setFetchingTechnicians] = useState(false); //Will not disable technician select, allows the user to search for technicians without diabling the input
  const [isUpdatingAssignedTechnicians, setIsUpdatingAssignedTechnicians] = useState(false); //Will disable technician select

  //Technician state
  const [technicianOptions, setTechnicianOptions] = useState<Option[]>([]);
  const [assignedTechnicians, setAssignedTechnicians] = useState<Option[]>([]);

  //Modals
  const [confirmDeleteModalIsOpen, setConfirmDeleteModalIsOpen] = useState(false);

  //Photo state
  const [fullScreenImage, setFullScreenImage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState<boolean>(true);

  //Event state
  const [events, setEvents] = useState<Array<IEvent | null>>([]);
  const [eventsStartKey, setEventsStartKey] = useState<StartKey | undefined>(undefined);

  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    async (e) => {
      e.preventDefault();
      setUploadingFiles(true);
      const selectedFs = e.target.files ?? [];
      const formData = new FormData();

      // Append all selected files to the FormData
      for (const imageFile of selectedFs) {
        formData.append('image', imageFile);
      }
      formData.append('uuid', workOrderId);

      try {
        const response = await axios.post('/api/upload-images', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.status === API_STATUS.SUCCESS) {
          await axios.post('/api/add-images-to-work-order', {
            pk: workOrder?.pk,
            sk: workOrder?.sk,
            images: [...(response?.data?.files ?? []), ...(workOrder?.images ?? [])],
          });
          setUploadedFiles(response?.data?.files ?? []);
          renderToastSuccess('Images uploaded successfully!', modalId);
          setUploadingFiles(false);
        } else {
          renderToastError(undefined, 'Images upload failed', modalId);
          setUploadingFiles(false);
        }
      } catch (error) {
        renderToastError(error, 'Images upload failed', modalId);
        setUploadingFiles(false);
      }
    },
    [workOrder?.images, workOrder?.pk, workOrder?.sk, workOrderId]
  );

  //Return a list of technician options based on string search input
  //Can also be used to get all technicians for an org by omitting the search string
  const searchTechnicians = useCallback(
    async (_searchString?: string) => {
      if (!user) return [];
      setFetchingTechnicians(true);
      try {
        const { data } = await axios.post('/api/get-techs-for-org', {
          organization: user.organization,
          startKey: undefined,
          techSearchString: _searchString,
        });
        const response = JSON.parse(data.response);

        if (!response.techs) {
          setFetchingTechnicians(false);
          return [];
        }
        const mappedTechnicians = response.techs.map((technician: any) => {
          return {
            value: technician.email,
            label: toTitleCase(technician.name),
          };
        });

        setFetchingTechnicians(false);
        return mappedTechnicians;
      } catch (err) {
        console.log({ err });
      }
      setFetchingTechnicians(false);
      return [];
    },
    [user]
  );

  const getWorkOrder = useCallback(
    async (inBackground?: boolean) => {
      if (!workOrderId || !user || !user.organization) return;
      !inBackground && setIsLoading(true);
      try {
        const { data } = await axios.post('/api/get-work-order', {
          pk: workOrderId,
          sk: workOrderId,
        });
        const _workOrder: IWorkOrder = JSON.parse(data.response);
        setWorkOrder(_workOrder);

        const mappedTechnicians = await searchTechnicians();
        setTechnicianOptions(mappedTechnicians);
        setAssignedTechnicians([]);
        const assignedToList = Array.from(_workOrder.assignedTo ?? []);
        if (_workOrder && assignedToList.length > 0 && mappedTechnicians.length > 0) {
          assignedToList.forEach((str: string) => {
            let technician: Option | undefined;
            //Backwards compatible with old assignedTo format
            if (str.includes(TECHNICIAN_DELIM)) {
              const keys: string[] = deconstructNameEmailString(str);
              technician = mappedTechnicians.find((technician: Option) => technician.value === keys[0]);
            } else {
              //str is just tech email in this case
              technician = mappedTechnicians.find((technician: Option) => technician.value === str);
            }

            if (technician) {
              //Only allow PMs to see who has viewed
              if (userType === USER_TYPE.PROPERTY_MANAGER && _workOrder.viewedWO && _workOrder.viewedWO.includes(technician.value)) {
                technician.label = technician.label + ' (viewed)';
              }
              setAssignedTechnicians((prev) => [...prev, { value: technician!.value, label: technician!.label }]);
            }
          });
        }
      } catch (err) {
        renderToastError(err, 'Error getting work order', modalId);
        console.error(err);
      }
      !inBackground && setIsLoading(false);
    },
    [workOrderId, user, userType, searchTechnicians]
  );

  const getWorkOrderEvents = useCallback(
    async (initialFetch: boolean, startKey?: StartKey) => {
      if (!workOrderId) return;
      setIsLoadingEvents(true);
      try {
        const { data } = await axios.post('/api/get-work-order-events', {
          workOrderId: deconstructKey(workOrderId),
          startKey,
        });
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
      if (!user || (!user.roles?.includes(USER_TYPE.TECHNICIAN) && !user?.roles?.includes(USER_TYPE.PROPERTY_MANAGER))) {
        throw new Error(USER_PERMISSION_ERROR);
      }
      const params = UpdateWorkOrderSchema.parse({
        pk: workOrderId,
        sk: workOrderId,
        status: status,
        email: user.email,
        name: altName ?? user.name,
      });
      const { data } = await axios.post('/api/update/work-order', params);
      const updatedWorkOrder = JSON.parse(data.response);
      if (updatedWorkOrder) {
        setWorkOrder(updatedWorkOrder);
      }
      await getWorkOrderEvents(true);
    } catch (e: any) {
      console.log(e);
      renderToastError(e, 'Error updating work order status', modalId);
    }
    setIsUpdatingStatus(false);
  };

  const handleUpdatePTE = async (newValue: PTE_Type) => {
    if (!workOrderId) return;
    setIsUpdatingPTE(true);
    try {
      if (!user || (!user.roles?.includes(USER_TYPE.TENANT) && !user?.roles?.includes(USER_TYPE.PROPERTY_MANAGER))) {
        throw new Error(USER_PERMISSION_ERROR);
      }
      const { data } = await axios.post('/api/update/work-order', {
        pk: workOrderId,
        sk: workOrderId,
        email: user.email,
        name: altName ?? user.name,
        permissionToEnter: newValue,
      } as UpdateWorkOrder);
      const updatedWorkOrder = JSON.parse(data.response);
      if (updatedWorkOrder) {
        setWorkOrder(updatedWorkOrder);
      }
      await getWorkOrderEvents(true);
      setIsUpdatingPTE(false);
    } catch (e: any) {
      console.log(e);
      renderToastError(e, 'Error updating work order permission to enter', modalId);
    }
    setIsUpdatingPTE(false);
  };

  const deleteWorkOrder = useCallback(
    async (workOrderId: string) => {
      if (!workOrderId) return;
      try {
        if (!user || userType !== ENTITIES.PROPERTY_MANAGER || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
          throw new Error(USER_PERMISSION_ERROR);
        }
        const { data } = await axios.post('/api/delete/work-order', {
          pk: workOrderId,
          sk: workOrderId,
          madeByEmail: user.email,
          madeByName: altName ?? user.name,
        } as DeleteWorkOrder);
        if (data.response) {
          router.push('/work-orders');
          renderToastSuccess('Work Order Deleted!', modalId);
          afterDelete();
        }
      } catch (err: any) {
        console.error(err);
        renderToastError(err, 'Error deleting work order', modalId);
      }
    },
    [user, router, afterDelete, altName, userType]
  );

  const handleAssignTechnician = async (_assignedTechnicians: MultiValue<Option>, actionMeta: ActionMeta<Option>) => {
    setIsUpdatingAssignedTechnicians(true);
    try {
      if (!user || !workOrder || userType !== USER_TYPE.PROPERTY_MANAGER) {
        throw new Error(USER_PERMISSION_ERROR);
      }
      const actionType = actionMeta.action;
      if (actionType === 'select-option') {
        const selectedTechnician = actionMeta.option as Option;
        await axios.post('/api/update/work-order/assign-technician', {
          pk: workOrderId,
          pmEmail: user.email,
          pmName: altName ?? user.name,
          technicianEmail: selectedTechnician.value,
          technicianName: selectedTechnician.label,
        } as AssignRemoveTechnician);
      } else if (actionType === 'remove-value') {
        const removedTechnician = actionMeta.removedValue as Option;
        const technicianName = removedTechnician.label.includes(' (viewed)') ? removedTechnician.label.replace(' (viewed)', '') : removedTechnician.label;

        await axios.post('/api/update/work-order/remove-technician', {
          pk: workOrderId,
          pmEmail: user.email,
          pmName: altName ?? user.name,
          technicianEmail: removedTechnician.value,
          technicianName,
        } as AssignRemoveTechnician);
      }
      getWorkOrder(true);
      await getWorkOrderEvents(true);
    } catch (err: any) {
      console.error(err);
      renderToastError(err, 'Error assigning or removing technician from work order', modalId);
    }
    setIsUpdatingAssignedTechnicians(false);
  };

  useEffect(() => {
    const fetchInOrder = async () => {
      if (!workOrderId || !user || !userType) return;
      await getWorkOrder();
      await getWorkOrderEvents(true);
    };
    fetchInOrder();
  }, [workOrderId, user, userType, uploadedFiles]);

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

  useEffect(() => {
    const updateViewedList = async () => {
      if (!user || !workOrder || !workOrderId || !userType || userType !== USER_TYPE.TECHNICIAN || !workOrder.assignedTo) return;
      const assignedToList = Array.from(workOrder.assignedTo);
      //When a tech is opening the WO and they are assigned to it and they have not viewed it yet
      if ((assignedToList.includes(user.email) || assignedToList.includes(constructNameEmailString(user.email, user.name))) && !workOrder.viewedWO?.includes(user.email)) {
        await axios.post('/api/update/work-order/technician-viewed', {
          pk: workOrderId,
          sk: workOrderId,
          technicianEmail: user.email,
          pmEmail: workOrder.pmEmail,
        } as UpdateViewedWORequest);
        await getWorkOrder(true);
      }
    };
    updateViewedList();
  }, [workOrder, user, userType, workOrderId]);

  return (
    <Modal id={modalId} isOpen={isOpen} onClose={onClose} bodyClasses={'p-0 w-11/12 max-w-2xl'} closeButtonClasses={`text-primary-content ${isLoading && 'hidden'}`}>
      {isLoading ? (
        <LargeModalSkeleton />
      ) : workOrder ? (
        <div id="work-order" className="box-border rounded overflow-hidden">
          <div className="w-full sticky top-0 overflow-hidden">
            <div className="bg-primary h-12 text-center py-2 px-4 text-sm text-primary-content flex items-center justify-center">
              <p>Created on {createdToFormattedDateTime(workOrder.created).join(' @ ')}</p>
            </div>
            <div className="flex bg-base-200 flex-col w-full align-middle items-center">
              <div className="text-xl my-auto flex flex-row items-center justify-between text-gray-600 w-full p-4 border-b border-base-300">
                <div className=" flex flex-col">
                  {toTitleCase(workOrder?.issue)}
                  <div className="text-md:text-base text-sm"># {deconstructKey(workOrderId)}</div>
                </div>
                <div className="flex flex-row items-center">
                  {!isMobile ? (
                    <>
                      {userType === USER_TYPE.PROPERTY_MANAGER && workOrder.status !== WO_STATUS.DELETED && (
                        <div
                          onClick={() => {
                            if (workOrder.status === WO_STATUS.DELETED) return;
                            setConfirmDeleteModalIsOpen(true);
                          }}
                        >
                          <BsTrashFill className="hover:text-error cursor-pointer text-2xl mr-4" />
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{ height: isMobile ? `calc(100vh - 300px)` : `calc(100vh - 265px)` }}
            className={`h-max pt-3 px-5 md:pb-8 pb-16 overflow-y-scroll overflow-x-hidden flex flex-col box-border text-md md:text-base`}
          >
            <div className="font-bold">Status</div>
            <div className="mt-0.5">
              {workOrder.status !== WO_STATUS.DELETED ? (
                <div className="child:border child:border-neutral child:border-opacity-25 flex flex-row">
                  <button
                    disabled={isUpdatingStatus}
                    onClick={(e) => !isUpdatingStatus && userType !== USER_TYPE.TENANT && handleUpdateStatus(e, WO_STATUS.TO_DO)}
                    className={`${workOrder.status === WO_STATUS.TO_DO ? 'bg-secondary' : 'bg-white'} ${
                      userType === USER_TYPE.TENANT ? 'pointer-events-none' : 'hover:bg-base-200 cursor-pointer'
                    } rounded px-5 py-3 mr-4 border-2 flex flex-col items-center disabled:opacity-25`}
                  >
                    <GoTasklist />
                    <span className="text-sm">Todo</span>
                  </button>
                  <button
                    disabled={isUpdatingStatus}
                    onClick={(e) => !isUpdatingStatus && userType !== USER_TYPE.TENANT && handleUpdateStatus(e, WO_STATUS.COMPLETE)}
                    className={`${workOrder.status === WO_STATUS.COMPLETE ? 'bg-secondary' : 'bg-white'} ${
                      userType === USER_TYPE.TENANT ? 'pointer-events-none' : 'hover:bg-base-200 cursor-pointer'
                    } rounded px-2 py-3 border-2 flex flex-col items-center disabled:opacity-25`}
                  >
                    <AiOutlineCheck />
                    <span className="text-sm">Complete</span>
                  </button>
                </div>
              ) : (
                <p className="text-error">{WO_STATUS.DELETED}</p>
              )}
            </div>

            <div className="mt-4 font-bold">Assigned To</div>
            <div className="w-full mt-0.5">
              <AsyncSelect
                placeholder={isUpdatingAssignedTechnicians || fetchingTechnicians ? 'Loading...' : assignedTechnicians.length === 0 ? 'Unassigned' : 'Assign technicians...'}
                isDisabled={isUpdatingAssignedTechnicians || userType !== ENTITIES.PROPERTY_MANAGER} // potentially could have logic for technicians to "self assign"
                className={'w-11/12 md:w-10/12 mt-1'}
                closeMenuOnSelect={true}
                isMulti
                defaultOptions={technicianOptions}
                value={assignedTechnicians}
                captureMenuScroll={true}
                loadOptions={(searchString: string) => searchTechnicians(searchString)}
                isLoading={isUpdatingAssignedTechnicians || fetchingTechnicians}
                onChange={handleAssignTechnician}
                isClearable={false} //Don't have the functionality for remove all yet
                menuPortalTarget={clientDocument?.getElementById(modalId) ?? clientDocument?.body}
              />
            </div>
            <div className="font-bold mt-4">Photos</div>
            <div className={`w-full mt-0.5 pb-2 ${images && images.length && 'grid grid-cols-3 md:grid-cols-5 md:gap-x-4 gap-x-0'}`}>
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
            <div className={'w-full md:grid-cols-5 md:gap-x-4 mt-0.5 gap-x-0 pb-2 border-b border-base-300'}>
              {uploadingFiles ? <LoadingSpinner /> : <input type="file" multiple name="image" accept="image/*" onChange={handleFileChange} />}
            </div>
            <div className="mt-4 font-bold">Permission to Enter</div>
            <div className={`${isUpdatingPTE && 'opacity-50'} text-center w-48`}>
              <Select
                options={PTEOptions as { value: PTE_Type; label: PTE_Type }[]}
                className="basic-single"
                classNamePrefix="select"
                value={{ value: workOrder.permissionToEnter, label: workOrder.permissionToEnter }}
                onChange={(v: { value: PTE_Type; label: PTE_Type } | null) => {
                  if (isUpdatingPTE) return;
                  v?.value && handleUpdatePTE(v.value);
                }}
                defaultValue={undefined}
                isDisabled={(!user?.roles?.includes(USER_TYPE.PROPERTY_MANAGER) && !user?.roles?.includes(USER_TYPE.TENANT)) || isUpdatingPTE}
                placeholder={workOrder.permissionToEnter as PTE_Type}
              />
            </div>
            <div className="mt-4 font-bold">Address</div>
            <div className="mt-0.5">
              {workOrder.address?.unit ? toTitleCase(workOrder.address.address + ' ' + workOrder.address.unit) : toTitleCase(workOrder.address.address)}
            </div>
            <div className="mt-4 font-bold">Tenant</div>
            <div className="mt-0.5">{toTitleCase(workOrder.tenantName)}</div>
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
            {userType !== ENTITIES.TENANT ? (
              <>
                <div className="flex flex-row items-center border-t border-base-300 pt-2 mt-4">
                  <div className="font-bold text-lg">Comments</div>
                  <AddCommentModal
                    workOrderId={workOrderId}
                    onSuccessfulAdd={async () => {
                      await getWorkOrderEvents(true);
                    }}
                  />
                </div>

                <div className="w-full mt-2" id="wo-modal-comments">
                  {events && events.length ? (
                    events.map((event: IEvent | null, i: number) => {
                      if (event) {
                        const formattedDateTime = createdToFormattedDateTime(event.created!);
                        return (
                          <MobileCard key={`${ENTITIES.EVENT}-${i}`} padding="p-2" marginBottom="mb-2">
                            <div className="text-sm">
                              <div className="mb-0.5 flex flex-row">
                                <p className="font-bold mr-2">{toTitleCase(event.madeByName)} </p>
                                <p className="text-neutral">
                                  {formattedDateTime[0]}
                                  {!isMobile ? ` @ ${formattedDateTime[1]}` : null}
                                </p>
                              </div>
                              <div className="break-words">{event.message}</div>
                            </div>
                          </MobileCard>
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
                      <button disabled={isLoadingEvents} onClick={() => getWorkOrderEvents(false, eventsStartKey)} className="btn btn-secondary mx-auto">
                        Load more
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
          {/* Allows us to use fixed and prevent content from being hidden by bottom nav */}
          <div className="btm-nav md:h-36 h-16 sticky opacity-0 pointer-events-none"></div>
          <div className="btm-nav w-full mt-2 h-16 bg-base-200 box-border text-sm fixed bottom-0 left-0 border-t border-base-300 py-2 text-center">
            Created by {workOrder.createdByType === USER_TYPE.TENANT ? 'Tenant' : 'Property Manager:'}{' '}
            {workOrder.createdByType === USER_TYPE.TENANT ? workOrder.tenantEmail : workOrder.pmEmail}
          </div>

          {/* Other modals */}
          {/* TODO:: this is appearing behind daisyUI Modals */}
          <Modal id="fullscreen-image-modal" isOpen={!!fullScreenImage} onClose={() => setFullScreenImage('')}>
            <div className="overflow-y-scroll" style={{ width: '100%', height: '100%' }}>
              {fullScreenImage && (
                <Image
                  src={fullScreenImage}
                  alt="Description"
                  className="w-full cursor-pointer my-auto overflow-y-scroll"
                  onClick={() => setFullScreenImage('')}
                  width={100}
                  height={40}
                />
              )}
            </div>
          </Modal>
          <ConfirmationModal
            id="delete-work-order-confirmation-modal"
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
      ) : (
        <div>
          <div className="w-full flex items-center justify-center font-bold mt-8">Work order not found.</div>
        </div>
      )}
    </Modal>
  );
};

export default WorkOrderModal;
