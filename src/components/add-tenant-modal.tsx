import { useUserContext } from "@/context/user";
import { CreateTenantBody } from "@/pages/api/create-tenant";
import axios from "axios";
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useState } from "react";
import { toast } from 'react-toastify';
import Modal from 'react-modal';

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: "75%",
    backgroundColor: 'rgba(255, 255, 255)'
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

export const AddTenantModal = ({ tenantModalIsOpen, setTenantModalIsOpen, onSuccessfulAdd }: { tenantModalIsOpen: boolean; setTenantModalIsOpen: Dispatch<SetStateAction<boolean>>; onSuccessfulAdd: () => void; }) => {

  const { user } = useUserContext();
  const [isBrowser, setIsBrowser] = useState(false);
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


  const handleTenantNameChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
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
  const handlePostalCodeChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setPostalCode(e.currentTarget.value);
  }, [setPostalCode]);

  function closeModal() {
    setTenantModalIsOpen(false);
  }

  const handleCreateNewTenant: FormEventHandler<HTMLFormElement> = useCallback(async (event) => {
    try {
      event.preventDefault();
      if (!user.pmEmail) {
        throw new Error("user needs to be a Property Manager.");
      }

      const { data } = await axios.post("/api/create-tenant", {
        tenantEmail,
        tenantName,
        pmEmail: user.pmEmail,
        organization: user.organization ?? "",
        address,
        unit,
        state,
        city,
        postalCode,
      });
      const { response } = data;
      const parsedUser = JSON.parse(response);
      if (parsedUser.modified) {
        toast.success("Tenant Created");
        onSuccessfulAdd();
        setTenantModalIsOpen(false);
      }
    } catch (err) {
      console.log({ err });
    }
  }, [
    user,
    onSuccessfulAdd,
    tenantEmail,
    tenantName,
    setTenantModalIsOpen,
    address,
    unit,
    state,
    city,
    postalCode]);

  return (
    <Modal
      isOpen={tenantModalIsOpen}
      onAfterOpen={() => { }}
      onRequestClose={closeModal}
      contentLabel="Example Modal"
      style={customStyles}
    >
      <button
        className="w-full text-right"
        onClick={closeModal}>X Close</button>

      <form onSubmit={handleCreateNewTenant} style={{ display: "grid" }}>
        <label htmlFor='name'>Tenant Name*</label>
        <input
          className='rounded px-1 border-solid border-2 border-slate-200'
          id="name"
          placeholder="John Doe"
          type={"text"}
          value={tenantName}
          onChange={handleTenantNameChange}
        />
        <label className='mt-5' htmlFor='email'>Email* </label>
        <input
          className='rounded px-1 border-solid border-2 border-slate-200'
          id="email"
          placeholder="someEmail@gmail.com"
          type={"email"}
          value={tenantEmail}
          onChange={handleEmailChange}
        />
        <label className='mt-5' htmlFor='address'>Address* </label>
        <input
          className='rounded px-1 border-solid border-2 border-slate-200'
          id="address"
          placeholder="123 Test St"
          type={"text"}
          value={address}
          onChange={handleAddressChange}
        />
        <label className='mt-5' htmlFor='address'>Unit </label>
        <input
          className='rounded px-1 border-solid border-2 border-slate-200'
          id="address"
          placeholder='207'
          type={"text"}
          value={unit}
          onChange={handleUnitChange}
        />
        <label className='mt-5' htmlFor='state'>State* </label>
        <input
          className='rounded px-1 border-solid border-2 border-slate-200'
          id="state"
          placeholder="FL"
          type={"text"}
          value={state}
          onChange={handleStateChange}
        />
        <label className='mt-5' htmlFor='city'>City* </label>
        <input
          className='rounded px-1 border-solid border-2 border-slate-200'
          id="city"
          placeholder="Miami"
          type={"text"}
          value={city}
          onChange={handleCityChange}
        />
        <label className='mt-5' htmlFor='postalCode'>Zip* </label>
        <input
          className='rounded px-1 border-solid border-2 border-slate-200'
          id="postalCode"
          placeholder="33131"
          type={"text"}
          value={postalCode}
          onChange={handlePostalCodeChange}
        />
        <button
          className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
          type="submit"
          disabled={!tenantName || !tenantEmail || !address || !state || !city || !postalCode}
        >
          Add Tenant
        </button>
      </form>
    </Modal >
  );
};