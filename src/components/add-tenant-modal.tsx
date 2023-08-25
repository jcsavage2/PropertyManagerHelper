import { useUserContext } from "@/context/user";
import axios from "axios";
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import Modal from "react-modal";
import { CSSTransition } from "react-transition-group";
import { CreateTenantBody } from "@/pages/api/create-tenant";
import { StateSelect } from "./state-select";
import { useDevice } from "@/hooks/use-window-size";
import PropertySelector from "./property-selector";
import { IProperty } from "@/database/entities/property";
import { v4 as uuid } from "uuid";
import { useSessionUser } from "@/hooks/auth/use-session-user";
import { LoadingSpinner } from "./loading-spinner/loading-spinner";
import { deconstructKey } from "@/utils";

export const AddTenantModal = ({
  tenantModalIsOpen,
  setTenantModalIsOpen,
  onSuccessfulAdd,
}: {
  tenantModalIsOpen: boolean;
  setTenantModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onSuccessfulAdd: () => void;
}) => {
  const { user } = useSessionUser();
  const [isBrowser, setIsBrowser] = useState(false);
  const { isMobile } = useDevice();
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      transform: "translate(-50%, -50%)",
      width: isMobile ? "90%" : "60%",
      maxHeight: "90%",
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

  const [stage, setStage] = useState(0);

  isBrowser && Modal.setAppElement("#testing");

  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [address, setAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [numBeds, setNumBeds] = useState(1);
  const [numBaths, setNumBaths] = useState(1);
  const [createNewProperty, setCreateNewProperty] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<IProperty | null>(null);
  const [createNewTenantLoading, setCreateNewTenantLoading] = useState(false);

  const handleTenantNameChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setTenantName(e.currentTarget.value);
    },
    [setTenantName]
  );
  const handleEmailChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setTenantEmail(e.currentTarget.value);
    },
    [setTenantEmail]
  );
  const handleAddressChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setAddress(e.currentTarget.value);
    },
    [setAddress]
  );
  const handleUnitChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setUnit(e.currentTarget.value);
    },
    [setUnit]
  );
  const handleCityChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setCity(e.currentTarget.value);
    },
    [setCity]
  );
  const handlePostalCodeChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setPostalCode(e.currentTarget.value);
    },
    [setPostalCode]
  );
  const handleNumBedsChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setNumBeds(Number(e.currentTarget.value) || 1);
    },
    [setCity]
  );
  const handleNumBathsChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setNumBaths(Number(e.currentTarget.value) || 1);
    },
    [setPostalCode]
  );

  const handleCreateNewTenant: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      try {
        event.preventDefault();
        if (!user) {
          throw new Error("user needs to be a Property Manager.");
        }
        setCreateNewTenantLoading(true);

        let body: CreateTenantBody;
        if (createNewProperty) {
          body = {
            tenantEmail,
            tenantName,
            pmEmail: user.email,
            address,
            unit,
            state,
            city,
            country: "US",
            postalCode,
            numBeds,
            numBaths,
            createNewProperty,
            organization: user.organization,
            propertyUUId: uuid(),
          };
        } else {
          if (!selectedProperty) throw new Error("No property selected with use existing property option.");
          body = {
            tenantEmail,
            tenantName,
            pmEmail: user.email,
            address: selectedProperty.address,
            unit: selectedProperty.unit,
            state: selectedProperty.state,
            city: selectedProperty.city,
            country: "US",
            postalCode: selectedProperty.postalCode,
            numBeds: selectedProperty.numBeds,
            numBaths: selectedProperty.numBaths,
            createNewProperty,
            organization: user.organization,
            propertyUUId: deconstructKey(selectedProperty.pk),
          };
        }

        const { data } = await axios.post("/api/create-tenant", { ...body });
        const { response } = data;
        const parsedUser = JSON.parse(response);
        if (parsedUser) {
          onSuccessfulAdd();
          toast.success("Tenant Created!", {
            position: toast.POSITION.TOP_CENTER,
          });
          setTenantModalIsOpen(false);
        }

        setTenantName("");
        setTenantEmail("");
        setAddress("");
        setUnit("");
        setState("");
        setCity("");
        setPostalCode("");
        setNumBeds(1);
        setNumBaths(1);
        setSelectedProperty(null);
        setCreateNewTenantLoading(false);
        setStage(0);
      } catch (err) {
        console.log({ err });
        toast.error("Error Creating Tenant. Please Try Again", {
          position: toast.POSITION.TOP_CENTER,
        });
        setCreateNewTenantLoading(false);
      }
    },
    [
      user,
      createNewProperty,
      setStage,
      onSuccessfulAdd,
      tenantEmail,
      tenantName,
      setTenantModalIsOpen,
      address,
      unit,
      state,
      city,
      postalCode,
      numBeds,
      numBaths,
      selectedProperty,
    ]
  );

  return (
    <Modal
      isOpen={tenantModalIsOpen}
      onRequestClose={() => setTenantModalIsOpen(false)}
      contentLabel="Add Tenant Modal"
      closeTimeoutMS={200}
      style={customStyles}
    >
      <div className="w-full text-right">
        <button
          className="bg-blue-200 px-2 py-1 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          onClick={() => setTenantModalIsOpen(false)}
        >
          X Close
        </button>
      </div>

      <form onSubmit={handleCreateNewTenant}>
        <CSSTransition in={stage === 0} timeout={500} classNames="slide" unmountOnExit style={{ display: "grid" }}>
          <div>
            <input
              className="rounded px-1 border-solid border-2 border-slate-200 mt-5"
              id="name"
              placeholder="Tenant Full Name*"
              type={"text"}
              value={tenantName}
              onChange={handleTenantNameChange}
            />
            <input
              className="rounded px-1 border-solid border-2 border-slate-200 mt-5"
              id="email"
              placeholder="Tenant Email*"
              type={"email"}
              value={tenantEmail}
              onChange={handleEmailChange}
            />
            <button
              onClick={() => setStage(1)}
              className="bg-blue-200 p-3 mt-7 text-gray-500 hover:bg-blue-300 rounded disabled:opacity-25"
              type="button"
              disabled={!tenantName || !tenantEmail}
            >
              Next
            </button>
          </div>
        </CSSTransition>
        <CSSTransition in={stage === 1} timeout={500} classNames="slide" unmountOnExit style={{ display: "grid" }}>
          <div>
            <div className="flex mt-2 flex-row items-center md:w-3/4 w-full mx-auto justify-center">
              <div
                onClick={() => {
                  setCreateNewProperty(true);
                }}
                className={`rounded mr-2 md:mr-8 p-2 border-b-2 cursor-pointer hover:bg-blue-300 hover:border-blue-300 md:w-full text-center ${createNewProperty && "bg-blue-200 border-blue-200"
                  }`}
              >
                {isMobile ? "New Property" : "Create New Property"}
              </div>
              <div
                onClick={() => {
                  setCreateNewProperty(false);
                }}
                className={`rounded md:ml-8 p-2 border-b-2 cursor-pointer hover:bg-blue-300 hover:border-blue-300 md:w-full text-center ${!createNewProperty && "bg-blue-200 border-blue-200"
                  }`}
              >
                {isMobile ? "Existing Property" : "Use Existing Property"}
              </div>
            </div>
            {createNewProperty ? (
              <div className="w-full">
                <input
                  className="rounded px-1 border-solid border-2 border-slate-200 mt-5 w-full"
                  id="address"
                  placeholder="Street Address*"
                  type={"text"}
                  value={address}
                  onChange={handleAddressChange}
                />
                <input
                  className="rounded px-1 border-solid border-2 border-slate-200 mt-5 w-full"
                  id="address"
                  placeholder="Unit Number"
                  type={"text"}
                  value={unit}
                  onChange={handleUnitChange}
                />
                <input
                  className="rounded px-1 border-solid border-2 border-slate-200 mt-5 w-full"
                  id="city"
                  placeholder="City*"
                  type={"text"}
                  value={city}
                  onChange={handleCityChange}
                />
                <div className="w-full mt-5">
                  <StateSelect label={null} placeholder="State*" state={state} setState={setState} />
                </div>

                <input
                  className="rounded px-1 border-solid border-2 border-slate-200 mt-5 w-full"
                  id="postalCode"
                  placeholder="Zip*"
                  type={"text"}
                  value={postalCode}
                  onChange={handlePostalCodeChange}
                />

                <div className={`flex flex-row mt-4 items-center w-full`}>
                  <label className="text-gray-600 text-center mr-4" htmlFor="beds">
                    Beds*:{" "}
                  </label>
                  <input
                    className="rounded px-1 border-solid border-2 border-slate-200 w-20 mr-auto"
                    type="number"
                    id="beds"
                    step={1}
                    min={1}
                    max={10}
                    value={numBeds}
                    onChange={handleNumBedsChange}
                  />
                  <label className="text-gray-600 text-center ml-2 mr-4" htmlFor="beds">
                    Baths*:{" "}
                  </label>
                  <input
                    className="rounded px-1 border-solid border-2 border-slate-200 w-20 mr-auto"
                    type="number"
                    id="baths"
                    min={1}
                    max={10}
                    step={0.5}
                    value={numBaths}
                    onChange={handleNumBathsChange}
                  />
                </div>
              </div>
            ) : (
              <PropertySelector selectedProperty={selectedProperty} setSelectedProperty={setSelectedProperty} email={user?.email ?? ""} />
            )}
            <button
              onClick={() => setStage(0)}
              className="bg-blue-200 p-3 mt-7 text-gray-600 w-full hover:bg-blue-300 rounded disabled:opacity-25"
              type="button"
              disabled={!tenantName || !tenantEmail}
            >
              Previous
            </button>
            <button
              className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
              type="submit"
              disabled={
                createNewTenantLoading ||
                !tenantName ||
                !tenantEmail ||
                (createNewProperty ? !address || !state || !city || !postalCode : !selectedProperty)
              }
            >
              {createNewTenantLoading ? <LoadingSpinner /> : "Add Tenant"}
            </button>
          </div>
        </CSSTransition>
      </form>
    </Modal>
  );
};
