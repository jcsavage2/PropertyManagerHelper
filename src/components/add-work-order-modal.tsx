import axios from "axios";
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Modal from "react-modal";
import { IProperty } from "@/database/entities/property";
import PropertySelector from "./property-selector";
import { SendEmailApiRequest } from "@/types";
import { LoadingSpinner } from "./loading-spinner/loading-spinner";
import { ITenant } from "@/database/entities/tenant";
import { useSessionUser } from "@/hooks/auth/use-session-user";
import { useUserContext } from "@/context/user";

const customStyles = {
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    transform: "translate(-50%, -50%)",
    width: "90%",
    height: "80%",
    backgroundColor: "rgba(255, 255, 255)",
  },
  overLay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(25, 255, 255, 0.75)",
  },
};

export const AddWorkOrderModal = ({ workOrderModalIsOpen, setWorkOrderModalIsOpen, onSuccessfulAdd }: { workOrderModalIsOpen: boolean; setWorkOrderModalIsOpen: Dispatch<SetStateAction<boolean>>; onSuccessfulAdd: () => void; }) => {
  const { user } = useSessionUser();
  const { userType } = useUserContext();
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  isBrowser && Modal.setAppElement("#workOrder");

  const [selectedProperty, setSelectedProperty] = useState<IProperty | null>(null);
  const [issueDescription, setIssueDescription] = useState("");
  const [issueLocation, setIssueLocation] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [submitWorkOrderLoading, setSubmitWorkOrderLoading] = useState(false);

  function closeModal() {
    setWorkOrderModalIsOpen(false);
  }

  const handleCreateWorkOrder: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      try {
        event.preventDefault();
        if (!user || !user.pmEmail) {
          throw new Error("user needs to be a Property Manager.");
        }
        if (!selectedProperty) {
          throw new Error("No property selected");
        }
        if(!userType){
          throw new Error("No userType");
        }
        setSubmitWorkOrderLoading(true);

        //get tenant name
        const tenantEmail = selectedProperty.tenantEmail ?? user.pmEmail;
        const getTenantResponse = await axios.post("/api/get-tenant-by-email", { tenantEmail });
        const tenant = JSON.parse(getTenantResponse.data.response) as ITenant;

        const body: SendEmailApiRequest = {
          issueDescription,
          issueLocation,
          additionalDetails,
          messages: [],
          pmEmail: user!.pmEmail,
          creatorEmail: user.pmEmail,
          creatorName: user.pmName ?? "",
          createdByType: userType,
          permissionToEnter: "no",
          address: selectedProperty.address,
          state: selectedProperty.state,
          city: selectedProperty.city,
          postalCode: selectedProperty.postalCode,
          tenantEmail,
          tenantName: tenant.tenantName,
        };

        const res = await axios.post("/api/send-work-order-email", body);
        if (res.status !== 200) throw new Error("Error creating and sending WO email");

        toast.success("Successfully Submitted Work Order!", {
          position: toast.POSITION.TOP_CENTER,
        });
        onSuccessfulAdd();
        setIssueDescription("");
        setIssueLocation("");
        setAdditionalDetails("");
        setSelectedProperty(null);
        setSubmitWorkOrderLoading(false);
      } catch (err) {
        console.log({ err });
        toast.error("Error Submitting Work Order. Please Try Again", {
          position: toast.POSITION.TOP_CENTER,
        });
        setSubmitWorkOrderLoading(false);
      }
    },
    [user, onSuccessfulAdd, setWorkOrderModalIsOpen, selectedProperty, issueDescription, issueLocation, additionalDetails]
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
      isOpen={workOrderModalIsOpen}
      onAfterOpen={() => {}}
      onRequestClose={closeModal}
      contentLabel="Example Modal"
      closeTimeoutMS={200}
      style={customStyles}
    >
      <div className="w-full text-right">
        <button className="bg-blue-200 px-2 py-1 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" onClick={closeModal}>
          X Close
        </button>
      </div>

      <PropertySelector selectedProperty={selectedProperty} setSelectedProperty={setSelectedProperty} email={user?.pmEmail ?? ""} />

      <form onSubmit={handleCreateWorkOrder} className="flex flex-col">
        {selectedProperty && (
          <div className="flex flex-col mt-4">
            <label htmlFor="issueDescription">Issue Details* </label>
            <input
              className="rounded px-1 border-solid border-2 border-slate-200 mb-5"
              id="issueDescription"
              type={"text"}
              value={issueDescription}
              onChange={handleIssueDescriptionChange}
            />
            <label htmlFor="issueLocation">Issue Location </label>
            <input
              className="rounded px-1 border-solid border-2 border-slate-200 mb-5"
              id="issueLocation"
              type={"text"}
              value={issueLocation}
              onChange={handleIssueLocationChange}
            />
            <label htmlFor="additionalDetails">Additional Details </label>
            <input
              className="rounded px-1 border-solid border-2 border-slate-200 mb-5"
              id="additionalDetails"
              type={"text"}
              value={additionalDetails}
              onChange={handleAdditionalDetailsChange}
            />
          </div>
        )}

        <button
          className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          type="submit"
          disabled={!issueDescription || !selectedProperty || submitWorkOrderLoading}
        >
          {submitWorkOrderLoading ? <LoadingSpinner /> : "Add Work Order"}
        </button>
      </form>
    </Modal>
  );
};
