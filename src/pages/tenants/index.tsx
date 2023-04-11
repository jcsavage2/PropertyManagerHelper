import { AddTenantModal } from "@/components/add-tenant-modal";
import { useUserContext } from "@/context/user";
import { useState } from "react";

const Portal = () => {
  const { user } = useUserContext();
  const [tenantModalIsOpen, setTenantModalIsOpen] = useState(false);
  const [propertyModalIsOpen, setPropertyModalIsOpen] = useState(false);

  const { pmName, organization } = user;

  return (
    <div id="testing" className="mx-4 mt-4">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <h1 className="text-2xl my-auto">{`Tenants`}</h1>
        <button
          className="bg-blue-200 p-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
        >+ New Tenant</button>

      </div>
      {organization && <h3>{`${organization}`}</h3>}
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