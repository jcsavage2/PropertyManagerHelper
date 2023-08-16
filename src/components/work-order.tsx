import { IEvent } from "@/database/entities/event";
import { IWorkOrder } from "@/database/entities/work-order";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { toTitleCase, deconstructKey, createdToFormattedDateTime, generateAddressKey } from "@/utils";
import { ActionMeta, MultiValue } from "react-select";
import { useUserContext } from "@/context/user";
import { AddCommentModal } from "./add-comment-modal";
import AsyncSelect from "react-select/async";
import { OptionType } from "@/types";
import { ITechnician } from "@/database/entities/technician";
import { AssignTechnicianBody } from "@/pages/api/assign-technician";
import { GoTasklist } from "react-icons/go";
import { AiOutlineCheck } from "react-icons/ai";
import { STATUS } from "@/constants";
import { BsPersonFill } from "react-icons/bs";
import { IoLocationSharp } from "react-icons/io5";
import { BiTimeFive } from "react-icons/bi";
import { LoadingSpinner } from "./loading-spinner/loading-spinner";
import { useSessionUser } from "@/hooks/auth/use-session-user";
import { GetTechniciansForPropertyManagerApiRequest } from "@/pages/api/get-all-technicians-for-pm";

const WorkOrder = ({ workOrderId }: { workOrderId: string; }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [workOrder, setWorkOrder] = useState<IWorkOrder | null>(null);
  const [events, setEvents] = useState<Array<IEvent | null>>([]);
  const [technicianOptions, setTechnicianOptions] = useState<OptionType[]>([]);
  const [assignedTechnicians, setAssignedTechnicians] = useState<OptionType[]>([]);
  const [loadingAssignedTechnicians, setLoadingAssignedTechnicians] = useState(true);
  const [assignedTechniciansMenuOpen, setAssignedTechniciansMenuOpen] = useState(false);
  const { user } = useSessionUser();
  const { userType } = useUserContext();
  const [openAddCommentModal, setOpenAddCommentModal] = useState(false);

  useEffect(() => {
    setLoadingAssignedTechnicians(true);
    //set assigned technicians name + email using technicianOptions
    setAssignedTechnicians([]);
    if (workOrder && workOrder.assignedTo && technicianOptions.length > 0) {
      Array.from(workOrder.assignedTo).forEach((email: string) => {
        const technician: OptionType | undefined = technicianOptions.find((technician) => technician.value === email);
        if (technician) {
          setAssignedTechnicians((prev) => [...prev, technician]);
        }
      });
    }
    setLoadingAssignedTechnicians(false);
  }, [workOrder, workOrder?.assignedTo, technicianOptions]);

  async function getTechnicians() {
    if (!workOrderId || userType !== "PROPERTY_MANAGER" || !user) return;
    try {
      const body: GetTechniciansForPropertyManagerApiRequest = { pmEmail: user?.email };
      const { data } = await axios.post("/api/get-all-technicians-for-pm", body);
      if (data.response) {
        const parsedTechnicians = JSON.parse(data.response) as ITechnician[];
        const mappedTechnicians = parsedTechnicians.map(technician => {
          return {
            value: technician.technicianEmail,
            label: technician.technicianName
          };
        });
        setTechnicianOptions(mappedTechnicians);
        setLoadingAssignedTechnicians(false);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const searchTechnicians = (inputValue: string) =>
    new Promise<OptionType[]>((resolve) => {
      resolve(technicianOptions.filter((i) => i.label.toLowerCase().includes(inputValue.toLowerCase()) || i.value.toLowerCase().includes(inputValue.toLowerCase())));
    });

  const getWorkOrder = useCallback(async () => {
    try {
      if (!workOrderId) {
        return;
      }
      const { data } = await axios.post("/api/get-work-order", {
        pk: workOrderId,
        sk: workOrderId,
      });
      if (data.response) {
        const workOrder: IWorkOrder = JSON.parse(data.response);
        setWorkOrder(workOrder);
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
    }
  }, [workOrderId]);

  const getWorkOrderEvents = useCallback(async () => {
    try {
      if (!workOrderId) {
        return;
      }
      setIsLoadingEvents(true);
      const { data } = await axios.post("/api/get-work-order-events", { workOrderId });
      if (data.response) {
        const parsed = JSON.parse(data.response);
        setEvents(parsed);
        setIsLoadingEvents(false);
      }
    } catch (err) {
      console.error(err);
    }
  }, [workOrderId]);

  const handleUpdateStatus = async (e: any, status: string) => {
    if (!workOrder || !user) return;
    setIsUpdatingStatus(true);

    const { data } = await axios.post("/api/update-work-order", {
      pk: workOrder.pk,
      sk: workOrder.sk,
      status: status,
      email: user.email,
    });

    const updatedWorkOrder = JSON.parse(data.response);

    if (updatedWorkOrder) {
      setWorkOrder(updatedWorkOrder.Attributes);
    }
    await getWorkOrderEvents();
    setIsUpdatingStatus(false);
  };

  const handleAssignTechnician = async (_assignedTechnicians: MultiValue<OptionType>, actionMeta: ActionMeta<OptionType>) => {
    setLoadingAssignedTechnicians(true);
    if (!user?.email || !workOrder || userType !== "PROPERTY_MANAGER") return;
    const actionType = actionMeta.action;
    if (actionType === "select-option") {
      const selectedTechnician = actionMeta.option as OptionType;
      const body: AssignTechnicianBody = {
        workOrderId,
        pmEmail: user.email,
        technicianEmail: selectedTechnician.value,
        technicianName: selectedTechnician.label,
        address: workOrder.address,
        status: workOrder?.status,
        permissionToEnter: workOrder?.permissionToEnter,
        issueDescription: workOrder?.issue,
      };
      await axios.post("/api/assign-technician", body);
    } else if (actionType === "remove-value") {
      const removedTechnician = actionMeta.removedValue as OptionType;
      await axios.post("/api/remove-technician", {
        workOrderId,
        pmEmail: user.email,
        technicianEmail: removedTechnician.value,
        technicianName: removedTechnician.label,
      } as AssignTechnicianBody);
    }
    await getWorkOrder();
    await getWorkOrderEvents();
    setLoadingAssignedTechnicians(false);
  };

  useEffect(() => {
    getWorkOrder();
    getWorkOrderEvents();
    getTechnicians();
  }, []);

  if (workOrder && !isLoading) {
    return (
      <div id="work-order">
        <AddCommentModal
          addCommentModalIsOpen={openAddCommentModal}
          setAddCommentModalIsOpen={setOpenAddCommentModal}
          workOrderId={workOrderId}
          onSuccessfulAdd={() => {
            getWorkOrder();
            getWorkOrderEvents();
          }}
        />
        <div className="flex flex-col w-full align-middle items-center">
          <div className="text-3xl my-auto flex flex-row items-end text-gray-600">
            {toTitleCase(workOrder?.issue)}
            {workOrderId && <div className="hidden md:inline text-lg ml-4 text-gray-400"># {deconstructKey(workOrderId)}</div>}
          </div>
          <hr className="w-full mt-2 mb-1" />
          <div>{workOrderId && <div className="inline md:hidden text-xs text-gray-400"># {deconstructKey(workOrderId)}</div>}</div>
          <div className="w-full md:grid md:grid-cols-2">
            <div className="md:col-auto flex flex-col w-full">
              <div className="font-bold text-center md:text-left text-base md:mt-4 mt-2 md:ml-12">Location</div>
              {workOrder.location && workOrder.location.length ? (
                <div className="text-md text-center md:text-left md:ml-16 text-gray-600">{workOrder.location}</div>
              ) : (
                <div className="text-md text-center md:text-left md:ml-16 text-gray-600 italic">None provided</div>
              )}
              <div className="flex flex-row font-bold text-base mt-4 mx-auto md:hidden">
                <p className="mr-2">PTE?</p>
                {workOrder.permissionToEnter === "yes" ? (
                  <p className="text-green-600 font-normal">{toTitleCase(workOrder.permissionToEnter)}</p>
                ) : (
                  <p className="text-red-600 font-normal">{toTitleCase(workOrder.permissionToEnter)}</p>
                )}
              </div>
              {workOrder.additionalDetails && workOrder.additionalDetails.length && (
                <div className="md:hidden mt-2">
                  <div className="font-bold text-center text-base">Additional Info</div>
                  <div className="text-base text-center text-gray-600">&quot;{workOrder.additionalDetails}&quot;</div>
                </div>
              )}
              <div className="font-bold md:mt-4 mt-2 md:ml-12 text-center md:text-start">Status</div>
              <div className="mt-1 text-md flex flex-row mx-auto text-gray-600">
                <button
                  disabled={isUpdatingStatus}
                  onClick={(e) => handleUpdateStatus(e, STATUS.TO_DO)}
                  className={`${
                    workOrder.status === STATUS.TO_DO && "bg-blue-200"
                  } rounded px-5 py-3 mr-4 border-2 border-slate-300 flex flex-col items-center hover:bg-blue-100 disabled:opacity-25`}
                >
                  <GoTasklist />
                  <span className="text-xs">Todo</span>
                </button>
                <button
                  disabled={isUpdatingStatus}
                  onClick={(e) => handleUpdateStatus(e, STATUS.COMPLETE)}
                  className={`${
                    workOrder.status === STATUS.COMPLETE && "bg-blue-200"
                  } rounded px-2 py-3 border-2 border-slate-300 flex flex-col items-center hover:bg-blue-100 disabled:opacity-25`}
                >
                  <AiOutlineCheck />
                  <span className="text-xs">Complete</span>
                </button>
              </div>
              <div className="font-bold mt-4 md:ml-12 text-center md:text-start">Assigned To</div>
              <div className="md:ml-16 md:mt-4 w-full">
                <AsyncSelect
                  placeholder={loadingAssignedTechnicians ? "Loading..." : assignedTechnicians.length === 0 ? "Unassigned" : "Assign technicians..."}
                  isDisabled={userType !== "PROPERTY_MANAGER"} // potentially could have logic for technicians to "self assign"
                  menuPosition="fixed"
                  className={"md:w-3/5 w-5/6 mb-6 md:mt-0 mt-2 md:my-auto mx-auto md:mx-0"}
                  closeMenuOnSelect={false}
                  isMulti
                  defaultOptions={technicianOptions}
                  value={assignedTechnicians}
                  captureMenuScroll={true}
                  loadOptions={searchTechnicians}
                  isLoading={loadingAssignedTechnicians}
                  onChange={handleAssignTechnician}
                  isClearable={false}
                  onMenuOpen={() => setAssignedTechniciansMenuOpen(true)}
                  onMenuClose={() => setAssignedTechniciansMenuOpen(false)}
                />
              </div>
            </div>

            <div className="md:col-auto flex-col w-full text-lg hidden md:flex mt-4">
              {workOrder.additionalDetails && workOrder.additionalDetails.length && (
                <div>
                  <div className="font-bold text-base">Additional Info</div>
                  <div className="text-base text-gray-600 ml-4">&quot;{workOrder.additionalDetails}&quot;</div>
                </div>
              )}
              <div className="flex flex-col align-middle font-bold text-base mt-4">
                <p>Permission to Enter</p>
                {workOrder.permissionToEnter === "yes" ? (
                  <p className="text-green-600 font-normal ml-4">{toTitleCase(workOrder.permissionToEnter)}</p>
                ) : (
                  <p className="text-red-600 font-normal ml-4">{toTitleCase(workOrder.permissionToEnter)}</p>
                )}
              </div>

              <div className="font-bold text-base mb-1 mt-4">Other Details</div>
              <div className="flex flex-row items-center ml-4 mb-1">
                <BsPersonFill className="mr-2" />
                {workOrder.tenantName}({workOrder.tenantEmail})
              </div>
              <div className="flex flex-row items-center ml-4 mb-1">
                <IoLocationSharp className="mr-2" />{" "}
                {generateAddressKey({ address: workOrder?.address?.address, unit: workOrder?.address?.unit ?? "" })}
              </div>
              <div className="flex flex-row items-center ml-4 mb-1">
                <BiTimeFive className="mr-2" />
                {createdToFormattedDateTime(workOrder.created).join(" @ ")}
              </div>
            </div>
          </div>
        </div>
        <div className="flex md:flex-row flex-col md:mt-4 w-full justify-center align-middle items-center">
          <button
            className="bg-blue-200 p-1 text-gray-600 hover:bg-blue-300 text-center md:mx-0 rounded disabled:opacity-25 h-8 w-32"
            onClick={() => setOpenAddCommentModal(true)}
            disabled={assignedTechniciansMenuOpen}
          >
            Add Comment
          </button>
        </div>
        <div className="h-full">
          {isLoadingEvents && (
            <div className="flex mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-3 py-3 px-4 text-left">
              <div className="dot animate-loader"></div>
              <div className="dot animate-loader animation-delay-200"></div>
              <div className="dot animate-loader animation-delay-400"></div>
            </div>
          )}
          {events
            ? events.map((event: IEvent | null, i: number) => {
              if (event) {
                const formattedDateTime = createdToFormattedDateTime(event.created);
                return (
                  <div key={i} className="mx-auto text-gray-800 w-11/12 rounded-md bg-gray-200 mt-4 mb-3 py-2 px-4 text-left">
                    <div className="text-sm text-gray-500">{event.updateMadeBy}</div>
                    <div className="text-sm text-gray-500">
                      {formattedDateTime[0]} @{formattedDateTime[1]}
                    </div>
                    <div className="break-words">{event.updateDescription}</div>
                  </div>
                );
              }
            })
            : "No events found"}
        </div>
      </div>
    );
  }
  if (isLoading) {
    return <LoadingSpinner containerClass={null} />;
  }
  return (
    <div>
      <div>None</div>
    </div>
  );
};

export default WorkOrder;
