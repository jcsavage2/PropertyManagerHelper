import { useUserContext } from "@/context/user";
import axios from "axios";
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useState } from "react";

import Modal from 'react-modal';

export const AddPropertyModal = ({ tenantModalIsOpen, setTenantModalIsOpen }: { tenantModalIsOpen: boolean; setTenantModalIsOpen: Dispatch<SetStateAction<boolean>>; }) => {
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
  const [zip, setZip] = useState("");

  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
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

  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setTenantName(e.currentTarget.value);
  }, [setTenantName]);
  const handleEmailChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setTenantEmail(e.currentTarget.value);
  }, [setTenantEmail]);
  const handleAddressChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setAddress(e.currentTarget.value);
  }, [setAddress]);
  const handleUnitChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setUnit(e.currentTarget.value);
  }, [setUnit]);
  const handleStateChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setState(e.currentTarget.value);
  }, [setState]);
  const handleCityChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setCity(e.currentTarget.value);
  }, [setCity]);
  const handleZipChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setZip(e.currentTarget.value);
  }, [setZip]);

  function closeModal() {
    setTenantModalIsOpen(false);
  }

  const handleCreateNewProperty: FormEventHandler<HTMLFormElement> = useCallback(async (event) => {
    try {
      event.preventDefault();
      const { data } = await axios.post("/api/create-new-property", { email: tenantEmail, userType: "TENANT", propertyManagerEmail: user.email });
      const { response } = data;
      const parsedUser = JSON.parse(response);
      if (parsedUser.modified) {

      }
    } catch (err) {
      console.log({ err });
    }
  }, [user]);

  return (
    <div>
      <Modal
        isOpen={tenantModalIsOpen}
        onAfterOpen={() => console.log("opened..")}
        onRequestClose={closeModal}
        contentLabel="Example Modal"
        style={customStyles}
      >
        <button
          className="w-full text-right"
          onClick={closeModal}>X Close</button>

        <form onSubmit={handleCreateNewProperty} style={{ display: "grid" }}>
          <label htmlFor='address'>Address </label>
          <input
            className='rounded px-1'
            id="address"
            type={"text"}
            value={address}
            onChange={handleAddressChange}
          />
          <label htmlFor='address'>Unit*</label>
          <input
            className='rounded px-1'
            id="address"
            placeholder='N/A if not applicable'
            type={"text"}
            value={unit}
            onChange={handleUnitChange}
          />
          <label htmlFor='address'>State*</label>
          <input
            className='rounded px-1'
            id="address"
            type={"text"}
            value={state}
            onChange={handleStateChange}
          />
          <label htmlFor='address'>City*</label>
          <input
            className='rounded px-1'
            id="address"
            type={"text"}
            value={city}
            onChange={handleCityChange}
          />
          <label htmlFor='address'>Zip* </label>
          <input
            className='rounded px-1'
            id="address"
            type={"text"}
            value={zip}
            onChange={handleZipChange}
          />
          <button
            className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
            type="submit"
            disabled={!tenantName || !tenantEmail || !address || !state || !city || !zip}
          >
            Add Property
          </button>
        </form>
      </Modal>
    </div>

  );
};