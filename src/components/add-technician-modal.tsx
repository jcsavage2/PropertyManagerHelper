import { useUserContext } from "@/context/user";
import axios from "axios";
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useState } from "react";
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { CreateTechnicianBody } from "@/pages/api/create-technician";
import { useSessionUser } from "@/hooks/auth/use-session-user";

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

export type AddTechnicianModalProps = {
  technicianModalIsOpen: boolean;
  setTechnicianModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onSuccessfulAdd: () => void;
};

export const AddTechnicianModal = ({ technicianModalIsOpen, setTechnicianModalIsOpen, onSuccessfulAdd }: AddTechnicianModalProps) => {

  const { user, sessionStatus } = useSessionUser();
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  isBrowser && Modal.setAppElement('#testing');

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const { userType } = useUserContext();

  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setName(e.currentTarget.value);
  }, [setName]);
  const handleEmailChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setEmail(e.currentTarget.value);
  }, [setEmail]);

  function closeModal() {
    setName("");
    setEmail("");
    setTechnicianModalIsOpen(false);
  }

  const handleCreateNewTechnician: FormEventHandler<HTMLFormElement> = useCallback(async (event) => {
    try {
      event.preventDefault();
      if (!user?.email || !user?.roles?.includes("PROPERTY_MANAGER") || userType !== "PROPERTY_MANAGER") {
        throw new Error("user needs to be a Property Manager.");
      }
      const { data } = await axios.post("/api/create-technician", {
        technicianEmail: email,
        technicianName: name,
        pmEmail: user.email,
        organization: user.organization ?? "",
      } as CreateTechnicianBody);
      const { response } = data;
      const parsedUser = JSON.parse(response);
      if (parsedUser.modified) {
        toast.success("Technician Created");
        onSuccessfulAdd();
        setTechnicianModalIsOpen(false);
      }
    } catch (err) {
      console.log({ err });
    }
  }, [user, userType, email, name, onSuccessfulAdd, setTechnicianModalIsOpen]);

  return (
    <Modal
      isOpen={technicianModalIsOpen}
      onAfterOpen={() => { }}
      onRequestClose={closeModal}
      contentLabel="Add New Technician Modal"
      style={customStyles}
    >
      <div className="w-full text-right">
        <button
          className="bg-blue-200 px-2 py-1 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          onClick={closeModal}>
          X Close
        </button>
      </div>

      <form onSubmit={handleCreateNewTechnician} style={{ display: "grid" }}>
        <input
          className='rounded px-1 border-solid border-2 border-slate-200 mt-5'
          id="name"
          placeholder="Technician Full Name*"
          type={"text"}
          value={name}
          onChange={handleNameChange}
        />
        <input
          className='rounded px-1 border-solid border-2 border-slate-200 mt-5'
          id="email"
          placeholder="Technician Email*"
          type="email"
          value={email}
          onChange={handleEmailChange}
        />
        <button
          className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          type="submit"
          disabled={!name || !email}
        >
          Add Technician
        </button>
      </form>
    </Modal >
  );
};