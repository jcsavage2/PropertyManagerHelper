import { useUserContext } from "@/context/user";
import axios from "axios";
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useState } from "react";
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { CreateTechnicianBody } from "@/pages/api/create-technician";
import { ITechnician } from "@/database/entities/technician";
import { AssignTechnicianBody } from "@/pages/api/assign-technician";

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

export type AssignTechnicianModalProps = { 
    assignTechnicianModalIsOpen: boolean;
    workOrderId: string;
    setAssignTechnicianModalIsOpen: Dispatch<SetStateAction<boolean>>; 
    onSuccessfulAdd: () => void; 
}

export const AssignTechnicianModal = ({ assignTechnicianModalIsOpen, workOrderId, setAssignTechnicianModalIsOpen, onSuccessfulAdd  }: AssignTechnicianModalProps) => {

  const { user } = useUserContext();
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  isBrowser && Modal.setAppElement('#testing');

  const [technicianEmail, setTechnicianEmail] = useState<string>("");
  const [technicians, setTechnicians] = useState<ITechnician[]>([]);

  useEffect(() => {
    async function getTechnicians() {
      try {
        if (!workOrderId) {
          return;
        }
        const { data } = await axios.post("/api/get-all-technicians-for-pm", { propertyManagerEmail: user.pmEmail });
        if (data.response) {
          const parsed = JSON.parse(data.response);
          setTechnicians(parsed);
        }
      } catch (err) {
        console.error(err);
      }
    }
    getTechnicians();
  }, [user.pmEmail])

  const handleTechnicianEmailChange: React.ChangeEventHandler<HTMLSelectElement> = useCallback((e) => {
    setTechnicianEmail(e.currentTarget.value);
    console.log("Email changed: ", e.currentTarget.value)
  }, [setTechnicianEmail]);

  const handleAssignNewTechnician: FormEventHandler<HTMLFormElement> = useCallback(async (event) => {
    try {
      event.preventDefault();
      if (!user.pmEmail) {
        throw new Error("user needs to be a Property Manager.");
      }
      const { data } = await axios.post("/api/assign-technician", {
        technicianEmail: technicianEmail,
        workOrderId,
        pmEmail: user.pmEmail,
      } as AssignTechnicianBody);
      const { response } = data;
      console.log(response)
      toast.success("Technician Assigned to Work Order");
      onSuccessfulAdd();
      setAssignTechnicianModalIsOpen(false);
    } catch (err) {
      console.log({ err });
    }
  }, [
    user,
    onSuccessfulAdd,
    technicianEmail,
    setAssignTechnicianModalIsOpen]);

  return (
    <Modal
      isOpen={assignTechnicianModalIsOpen}
      onAfterOpen={() => { }}
      onRequestClose={() => setAssignTechnicianModalIsOpen(false)}
      contentLabel="Assign Technician to Work Order Modal"
      style={customStyles}
    >
      <button
        className="w-full text-right"
        onClick={() => setAssignTechnicianModalIsOpen(false)}>X Close</button>

      <form onSubmit={handleAssignNewTechnician} style={{ display: "grid" }}>
        <label htmlFor='technicianEmail'>Technician: *</label>
        <select id='technicianEmail' onChange={handleTechnicianEmailChange}>
            <option selected value=''>Select a technician to assign the work order to</option>
          {technicians && technicians.map((tech: ITechnician, index: number) => {
            return <option key={index} value={tech.technicianEmail}>{tech.technicianEmail}</option> })
          }
        </select>
        <button
          className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          type="submit"
          disabled={!technicianEmail}
        >
          Assign Technician
        </button>
      </form>
    </Modal >
  );
};