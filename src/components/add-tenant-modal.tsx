import { useUserContext } from "@/context/user";
import axios from "axios";
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useState } from "react";
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { CSSTransition } from 'react-transition-group';
import { CreateTenantBody } from "@/pages/api/create-tenant";

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
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

  const [stage, setStage] = useState(0);
  const nextStage = () => setStage(prevStage => prevStage + 1);
  const prevStage = () => setStage(prevStage => prevStage - 1);

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

      const body: CreateTenantBody = {
        tenantEmail,
        tenantName,
        pmEmail: user.pmEmail,
        address,
        unit,
        state,
        city,
        country: "US",
        postalCode,
      };

      const { data } = await axios.post("/api/create-tenant", { ...body });
      const { response } = data;
      const parsedUser = JSON.parse(response);
      if (parsedUser.modified) {
        onSuccessfulAdd();
        toast.success("Tenant Created");
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
    postalCode
  ]);

  return (
    <Modal
      isOpen={tenantModalIsOpen}
      onAfterOpen={() => { }}
      onRequestClose={closeModal}
      contentLabel="Example Modal"
      closeTimeoutMS={200}
      style={customStyles}
    >
      <div className="w-full text-right">
        <button
          className="bg-blue-200 px-2 py-1 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          onClick={closeModal}>
          X Close
        </button>
      </div>

      <form onSubmit={handleCreateNewTenant}>
        <CSSTransition
          in={stage === 0}
          timeout={500}
          classNames="slide"
          unmountOnExit
          style={{ display: "grid" }}
        >
          <div>
            <input
              className='rounded px-1 border-solid border-2 border-slate-200 mt-5'
              id="name"
              placeholder="Tenant Full Name*"
              type={"text"}
              value={tenantName}
              onChange={handleTenantNameChange}
            />
            <input
              className='rounded px-1 border-solid border-2 border-slate-200 mt-5'
              id="email"
              placeholder="Tenant Email*"
              type={"email"}
              value={tenantEmail}
              onChange={handleEmailChange}
            />
            <button
              onClick={nextStage}
              className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
              type="button"
              disabled={!tenantName || !tenantEmail}
            >
              Next
            </button>
          </div>
        </CSSTransition>
        <CSSTransition
          in={stage === 1}
          timeout={500}
          classNames="slide"
          unmountOnExit
          style={{ display: "grid" }}
        >
          <div>
            <input
              className='rounded px-1 border-solid border-2 border-slate-200 mt-5'
              id="address"
              placeholder="Street Address*"
              type={"text"}
              value={address}
              onChange={handleAddressChange}
            />
            <input
              className='rounded px-1 border-solid border-2 border-slate-200 mt-5'
              id="address"
              placeholder='Unit Number'
              type={"text"}
              value={unit}
              onChange={handleUnitChange}
            />
            <input
              className='rounded px-1 border-solid border-2 border-slate-200 mt-5'
              id="city"
              placeholder="City*"
              type={"text"}
              value={city}
              onChange={handleCityChange}
            />
            <input
              className='rounded px-1 border-solid border-2 border-slate-200 mt-5'
              id="state"
              placeholder="State*"
              type={"text"}
              value={state}
              onChange={handleStateChange}
            />
            <input
              className='rounded px-1 border-solid border-2 border-slate-200 mt-5'
              id="postalCode"
              placeholder="Zip*"
              type={"text"}
              value={postalCode}
              onChange={handlePostalCodeChange}
            />
            <button
              onClick={prevStage}
              className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
              type="button"
              disabled={!tenantName || !tenantEmail}
            >Previous</button>
            <button
              className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
              type="submit"
              disabled={!tenantName || !tenantEmail || !address || !state || !city || !postalCode}
            >
              Add Tenant
            </button>
          </div>
        </CSSTransition>
      </form>
    </Modal >
  );
};