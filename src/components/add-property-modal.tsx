import { useUserContext } from "@/context/user";
import axios from "axios";
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useState } from "react";

import Modal from 'react-modal';
import Select from "react-select";
import { StateSelect } from "./state-select";

export const AddPropertyModal = ({ addPropetyModalIsOpen, setAddPropertyModalIsOpen }: { addPropetyModalIsOpen: boolean; setAddPropertyModalIsOpen: Dispatch<SetStateAction<boolean>>; }) => {
  const [isBrowser, setIsBrowser] = useState(false);
  const { user } = useUserContext();

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  isBrowser && Modal.setAppElement('#testing');

  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [address, setAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      width: "50%",
      transform: 'translate(-50%, -50%)',
    },
    overLay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(25, 255, 255, 0.75)'
    }
  };

  const handleAddressChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setAddress(e.currentTarget.value);
  }, [setAddress]);
  const handleUnitChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setUnit(e.currentTarget.value);
  }, [setUnit]);
  const handleCityChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setCity(e.currentTarget.value);
  }, [setCity]);
  const handleZipChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setPostalCode(e.currentTarget.value);
  }, [setPostalCode]);

  function closeModal() {
    setAddPropertyModalIsOpen(false);
  }

  const handleCreateNewProperty: FormEventHandler<HTMLFormElement> = useCallback(async (event) => {
    try {
      event.preventDefault();
      const { data } = await axios.post("/api/create-property", { email: tenantEmail, userType: "TENANT", propertyManagerEmail: user.pmEmail });
      const { response } = data;
      const parsedUser = JSON.parse(response);
      if (parsedUser.modified) {

      }
    } catch (err) {
      console.log({ err });
    }
  }, [user, tenantEmail]);

  return (
    <div>
      <Modal
        isOpen={addPropetyModalIsOpen}
        onAfterOpen={() => { }}
        onRequestClose={closeModal}
        contentLabel="Example Modal"
        closeTimeoutMS={200}
        style={customStyles}
      >
        <button
          className="w-full text-right"
          onClick={closeModal}>X Close</button>

        <form onSubmit={handleCreateNewProperty} style={{ display: "grid" }}>
          <label htmlFor='address'>Address </label>
          <input
            className='rounded px-1 border-solid border-2 border-slate-200'
            placeholder="123 some street"
            id="address"
            type={"text"}
            value={address}
            onChange={handleAddressChange}
          />
          <label htmlFor='address'>Unit*</label>
          <input
            className='rounded px-1 border-solid border-2 border-slate-200'
            id="unit"
            placeholder='1704'
            type={"text"}
            value={unit}
            onChange={handleUnitChange}
          />
          <StateSelect state={state} setState={setState} />
          <label htmlFor='address'>City*</label>
          <input
            className='rounded px-1 border-solid border-2 border-slate-200'
            id="address"
            type={"text"}
            value={city}
            onChange={handleCityChange}
          />
          <label htmlFor='address'>Zip* </label>
          <input
            className='rounded px-1 border-solid border-2 border-slate-200'
            id="address"
            type={"text"}
            value={postalCode}
            onChange={handleZipChange}
          />
          <label htmlFor='tenant'>Select Tenant</label>
          <Select options={[]} id="tenant" />

          <button
            className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
            type="submit"
            disabled={!tenantName || !tenantEmail || !address || !state || !city || !postalCode}
          >
            Add Property
          </button>
        </form>
      </Modal>
    </div>

  );
};