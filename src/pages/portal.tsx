import { AddTenantModal } from "@/components/add-tenant-modal";
import { useUserContext } from "@/context/user";
import { useState } from "react";

const Portal = () => {
  const { user } = useUserContext();
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const { name, organization, tenants = [] } = user;

  return (
    <div id="testing" className="ml-4 mt-4">
      <p>{`Hello${name ? ` ${name}` : ""}!`}</p>
      <p>{organization ? `${organization}` : `You aren't yet part of an organization!`}</p>
      <button
        className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
        onClick={() => setModalIsOpen(true)}>Add New Tenant</button>
      <br />
      <AddTenantModal modalIsOpen={modalIsOpen} setModalIsOpen={setModalIsOpen} />

      <h3 className="font-bold mt-4">Tenants:</h3>
      {tenants?.map(t => {
        return (
          <div key={t}>
            {t}
          </div>
        );
      })}

    </div>
  );
};

export default Portal;