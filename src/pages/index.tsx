import { useEffect, useState } from "react";

import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Modal from 'react-modal';

import { useSessionUser } from "@/hooks/auth/use-session-user";
import { LoadingSpinner } from "@/components/loading-spinner/loading-spinner";
import { useUserContext } from "@/context/user";
import { userRoles } from "@/database/entities/user";

const Home = () => {
  const router = useRouter();
  const { query } = router;
  const { setUserType } = useUserContext();
  const { user, sessionStatus } = useSessionUser();
  const [showNotice, setShowNotice] = useState(false);

  if (query?.authredirect && !user?.email && sessionStatus === "unauthenticated") {
    const alreadyRedirected = localStorage.getItem("PILLAR::REDIRECT");
    if (!alreadyRedirected) {
      localStorage.setItem("PILLAR::REDIRECT", "true");
      signIn("", { callbackUrl: `${window.location.origin}/` });
    } else {
      router.push("/");
    }
  }

  useEffect(() => {
    const hasSeenNotice = sessionStorage.getItem("PILLAR::NOTICE");
    if (hasSeenNotice) {
      return;
    } else {
      setShowNotice(true);
      sessionStorage.setItem("PILLAR::NOTICE", "false");
    };
  }, []);

  function closeModal() {
    setShowNotice(false);
  }

  useEffect(() => {
    const allUserRoles = user?.roles ?? [];
    if (!allUserRoles.length) {
      return;
    }

    const userIsTenant = allUserRoles.includes(userRoles.TENANT);
    if (userIsTenant) {
      // always default to the tenant view if the user has the tenant role. 
      router.push("/work-order-chatbot");
    } else {
      // for technicians and PMs, always go to work-orders page. 
      router.push("/work-orders");
    }
  }, [router, user?.roles]);

  if (sessionStatus === "loading") {
    return <LoadingSpinner containerClass={"mt-4"} />;
  }

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

  return (
    <>
      <div className="text-center">
        <h1 className="mt-12 text-3xl">Pillar Property Management</h1>
        <br />
        {!user?.email && (
          <button
            onClick={() => signIn()}
            className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25">
            Sign In/Sign Up
          </button>
        )}
        {!!user?.email && (
          <div className="" style={{ display: "grid", gridTemplateColumns: "1fr", rowGap: "2em" }}>
            <button
              className="justify-self-center bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-9/12 md:w-6/12"
              onClick={() => {
                setUserType("TENANT");
                router.push("/work-order-chatbot");
              }}
            >Continue as Tenant</button>

            <button
              className="justify-self-center bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-9/12 md:w-6/12"
              onClick={async () => {
                setUserType("PROPERTY_MANAGER");
                router.push("/work-orders");
              }}>Continue as Property Manager</button>
            <button
              className="justify-self-center bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-9/12 md:w-6/12"
              onClick={async () => {
                setUserType("TECHNICIAN");
                router.push("/work-orders");
              }}>Continue as Technician</button>
          </div>
        )}
        <Modal
          isOpen={showNotice}
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
          <div className="w-full text-center">
            <h3 className="mt-5">NOTICE</h3>
            <p>This application is in the process of being developed and is not yet stable for public use. Please contact pillar@pillarhq.co if you would like more information.</p>
            <p>Pillar is not responsible for any transactions or data submitted during this period.</p>
          </div>

        </Modal>
      </div>
    </>
  );
};

export default Home;