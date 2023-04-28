import { useUserContext } from "@/context/user";
import axios from "axios";
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useState } from "react";
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { CreateCommentBody } from "@/pages/api/create-comment";
import { deconstructKey } from "@/utils";

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

export type AddCommentModalProps = { 
    addCommentModalIsOpen: boolean;
    workOrderId: string;
    setAddCommentModalIsOpen: Dispatch<SetStateAction<boolean>>; 
    onSuccessfulAdd: () => void; 
}

export const AddCommentModal = ({ addCommentModalIsOpen, workOrderId, setAddCommentModalIsOpen, onSuccessfulAdd }: AddCommentModalProps) => {

  const { user } = useUserContext();
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  isBrowser && Modal.setAppElement('#work-order');

  const [comment, setComment] = useState("");

  const handleCommentChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setComment(e.currentTarget.value);
  }, [setComment]);

  function closeModal() {
    setComment("");
    setAddCommentModalIsOpen(false);
  }

  const handleCreateNewComment: FormEventHandler<HTMLFormElement> = useCallback(async (event) => {
    try {
      event.preventDefault();
      const { data } = await axios.post("/api/create-comment", {
        comment,
        email: deconstructKey(user.pk),
        workOrderId: deconstructKey(workOrderId)
      } as CreateCommentBody);
      const { response } = data;
      const parsedUser = JSON.parse(response);
      if (parsedUser.modified) {
        toast.success("Comment Successfully Added");
        onSuccessfulAdd();
        setAddCommentModalIsOpen(false);
      }
    } catch (err) {
      console.log({ err });
    }
  }, [
    user,
    onSuccessfulAdd,
    comment,
    workOrderId,
    setAddCommentModalIsOpen]);

  return (
    <Modal
      isOpen={addCommentModalIsOpen}
      onAfterOpen={() => { }}
      onRequestClose={closeModal}
      contentLabel="Add New Technician Modal"
      style={customStyles}
    >
      <button
        className="w-full text-right"
        onClick={closeModal}>X Close</button>

      <form onSubmit={handleCreateNewComment} style={{ display: "grid" }}>
        <label htmlFor='name'>What would you like to say? </label>
        <input
          className='rounded px-1 border-solid border-2 border-slate-200'
          id="comment"
          placeholder="Issue not as described; toilet was leaking from tank, not bowl."
          type={"text"}
          value={comment}
          onChange={handleCommentChange}
        />
        <button
          className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          type="submit"
          disabled={!comment.length}
        >
          Add Comment
        </button>
      </form>
    </Modal >
  );
};