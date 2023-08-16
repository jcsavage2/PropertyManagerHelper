import axios from "axios";
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useState } from "react";
import Modal from "react-modal";
import Select, { SingleValue } from "react-select";
import { StateSelect } from "./state-select";
import { useDevice } from "@/hooks/use-window-size";
import { OptionType } from "@/types";
import { CreatePropertyBody } from "@/pages/api/create-property";
import { toast } from "react-toastify";
import { useSessionUser } from "@/hooks/auth/use-session-user";
import { useUserContext } from "@/context/user";
import { GetTenantsForPropertyManagerApiRequest } from "@/pages/api/get-all-tenants-for-pm";

export const AddPropertyModal = ({ addPropetyModalIsOpen, setAddPropertyModalIsOpen }: { addPropetyModalIsOpen: boolean; setAddPropertyModalIsOpen: Dispatch<SetStateAction<boolean>> }) => {
  const [isBrowser, setIsBrowser] = useState(false);
  const { user } = useSessionUser();
  const { isMobile } = useDevice();

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  isBrowser && Modal.setAppElement('#testing');

  const { userType } = useUserContext();

  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantOptions, setTenantOptions] = useState<OptionType[]>([]);
  const [address, setAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [numBeds, setNumBeds] = useState(1);
  const [numBaths, setNumBaths] = useState(1);

  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      width: isMobile ? "90%" : "50%",
      transform: "translate(-50%, -50%)",
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
  const handleZipChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
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

  function closeModal() {
    setAddPropertyModalIsOpen(false);
  }

  const handleCreateNewProperty: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      try {
        event.preventDefault();

        if(!user || !user.pmEmail) throw new Error("No PM email found")

        const response = await axios.post("/api/create-property", { address, city, state, postalCode, unit, pmEmail: user.pmEmail, numBeds, numBaths, tenantEmail } as CreatePropertyBody);

        if(response.status !== 200) throw new Error("Error creating property")
        toast.success("Property Created!", {
          position: toast.POSITION.TOP_CENTER,
        });
        closeModal();
        setAddress("");
        setCity("");
        setState("");
        setPostalCode("");
        setUnit("");
        setNumBeds(1);
        setNumBaths(1);
      } catch (err: any) {
        console.log({ err });
        toast.error("Error Creating Property. Please Try Again", {
          position: toast.POSITION.TOP_CENTER,
        });
      }
    },
    [user, user?.pmEmail, tenantEmail, address, city, state, postalCode, unit, numBeds, numBaths]
  );

  const handleGetTenants = useCallback(async () => {
    try {
      if (!user?.email || userType !== "PROPERTY_MANAGER") return;
      const { data } = await axios.post("/api/get-all-tenants-for-pm", { pmEmail: user.pmEmail } as GetTenantsForPropertyManagerApiRequest);
      const tenants = JSON.parse(data.response);
      if (tenants.length > 0) {
        let processedTenants = tenants.map((tenant: any) => {
          return { value: tenant.tenantEmail, label: `${tenant.tenantName} (${tenant.tenantEmail})` };
        });
        setTenantOptions(processedTenants);
      }
    } catch (err) {
      console.log({ err });
    }
  }, [user, setTenantOptions, userType]);

  useEffect(() => {
    if (addPropetyModalIsOpen) {
      handleGetTenants();
    }
  }, [addPropetyModalIsOpen]);

  return (
    <div>
      <Modal
        isOpen={addPropetyModalIsOpen}
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

        <form onSubmit={handleCreateNewProperty} style={{ display: "grid" }}>
          <label htmlFor="address">Address* </label>
          <input className="rounded px-1 border-solid border-2 border-slate-200 text-gray-600" placeholder="123 some street" id="address" type={"text"} value={address} onChange={handleAddressChange} />
          <label htmlFor="address">Unit </label>
          <input className="rounded px-1 border-solid border-2 border-slate-200" id="unit" placeholder="1704" type={"text"} value={unit} onChange={handleUnitChange} />
          <StateSelect state={state} setState={setState} label={"State*"} placeholder="Select..." />
          <label htmlFor="address">City*</label>
          <input className="rounded px-1 border-solid border-2 border-slate-200" id="address" type={"text"} placeholder="Springfield" value={city} onChange={handleCityChange} />
          <label htmlFor="address">Zip* </label>
          <input className="rounded px-1 border-solid border-2 border-slate-200" id="address" type={"text"} value={postalCode} onChange={handleZipChange} placeholder="000000" />
          <div className={`flex flex-row w-5/6 mt-2 items-center sm:w-full`}>
            <label className="text-center mr-4" htmlFor="beds">
              Beds*:{" "}
            </label>
            <input className="rounded px-1 border-solid border-2 border-slate-200 w-20 mr-auto" type="number" id="beds" step={1} min={1} max={10} value={numBeds} onChange={handleNumBedsChange} />
            <label className="text-center ml-2 mr-4" htmlFor="beds">
              Baths*:{" "}
            </label>
            <input className="rounded px-1 border-solid border-2 border-slate-200 w-20 mr-auto" type="number" id="baths" min={1} max={10} step={0.5} value={numBaths} onChange={handleNumBathsChange} />
          </div>

          <label htmlFor="tenant" className="mt-2">
            Select Tenant
          </label>
          <Select
            options={tenantOptions}
            id="tenant"
            onChange={(value: SingleValue<OptionType>) => {
              setTenantEmail(value ? value.value : "");
            }}
            isClearable={true}
          />

          <button className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4" type="submit" disabled={!address || !state || !city || !postalCode}>
            Add Property
          </button>
        </form>
      </Modal>
    </div>
  );
};
