import { useUserContext } from "@/context/user";
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useState } from "react";

import Modal from 'react-modal';

export const AddTenantModal = ({ modalIsOpen, setModalIsOpen }: { modalIsOpen: boolean; setModalIsOpen: Dispatch<SetStateAction<boolean>>; }) => {
  Modal.setAppElement('#testing');
  const { user, createUserInDB } = useUserContext();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
    setName(e.currentTarget.value);
  }, [setName]);
  const handleEmailChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setEmail(e.currentTarget.value);
  }, [setEmail]);
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
    setModalIsOpen(false);
  }

  const handleCreateNewUser: FormEventHandler<HTMLFormElement> = useCallback(async (event) => {
    try {
      event.preventDefault();
      await createUserInDB({ email, userType: "TENANT", propertyManagerEmail: user.email });
    } catch (err) {
      console.log({ err });
    }
  }, [user]);

  return (
    <div>
      <Modal
        isOpen={modalIsOpen}
        onAfterOpen={() => console.log("opened..")}
        onRequestClose={closeModal}
        contentLabel="Example Modal"
        style={customStyles}
      >
        <button
          className="w-full text-right"
          onClick={closeModal}>X Close</button>

        <form onSubmit={handleCreateNewUser} style={{ display: "grid" }}>
          <label htmlFor='name'>Tenant Name</label>
          <input
            className='rounded px-1'
            id="name"
            type={"text"}
            value={name}
            onChange={handleNameChange}
          />
          <label htmlFor='email'>Email* </label>
          <input
            className='rounded px-1'
            id="email"
            type={"email"}
            value={email}
            onChange={handleEmailChange}
          />
          <label htmlFor='address'>Address* </label>
          <input
            className='rounded px-1'
            id="address"
            type={"text"}
            value={address}
            onChange={handleAddressChange}
          />
          <label htmlFor='address'>Unit </label>
          <input
            className='rounded px-1'
            id="address"
            placeholder='N/A if not applicable'
            type={"text"}
            value={unit}
            onChange={handleUnitChange}
          />
          <label htmlFor='address'>State* </label>
          <input
            className='rounded px-1'
            id="address"
            type={"text"}
            value={state}
            onChange={handleStateChange}
          />
          <label htmlFor='address'>City* </label>
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
            disabled={!name || !email || !address || !unit || !state || !city || !zip}
          >
            Create New User
          </button>
        </form>
      </Modal>
    </div>

  );
};