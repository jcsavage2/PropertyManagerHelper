import { AddTenantModal } from "@/components/add-tenant-modal";
import { useUserContext } from "@/context/user";
import { useState } from "react";

const Portal = () => {
  const { user } = useUserContext();
  const [tenantModalIsOpen, setTenantModalIsOpen] = useState(false);
  const [propertyModalIsOpen, setPropertyModalIsOpen] = useState(false);

  const { pmName, organization } = user;

  return (
    <div id="testing" className="ml-4 mt-4">
      <p>{`Hello${pmName ? ` ${name}` : ""}!`}</p>
      <p>{organization ? `${organization}` : `You aren't yet part of an organization!`}</p>
      <button
        className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
        onClick={() => setTenantModalIsOpen(true)}>Add New Tenant</button>
      <br />
      <button
        className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
        onClick={() => setPropertyModalIsOpen(true)}>Add Property</button>
      <br />
      <AddTenantModal tenantModalIsOpen={tenantModalIsOpen} setTenantModalIsOpen={setTenantModalIsOpen} />


    </div>
  );
};

export default Portal;