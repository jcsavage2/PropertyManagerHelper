import { useUserContext } from "@/context/user";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { AddTenantModal } from "@/components/add-tenant-modal";
import { PortalLeftPanel } from "@/components/portal-left-panel";
import { useDevice } from "@/hooks/use-window-size";
import { BottomNavigationPanel } from "@/components/bottom-navigation-panel";
import { TenantsTable } from "@/pages/tenants/tenants-table";
import TenantsCards from "./tenant-cards";
import { ImportTenantsModal } from "@/components/import-tenants-modal";

const Tenants = () => {
  const { user } = useUserContext();
  const { isMobile } = useDevice();

  const [addTenantModalIsOpen, setAddTenantModalIsOpen] = useState(false);
  const [importTenantModalIsOpen, setImportTenantModalIsOpen] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);

  useEffect(() => {
    if (user.pmEmail) {
      async function get() {
        setTenantsLoading(true);
        const { data } = await axios.post("/api/get-all-tenants-for-pm", { propertyManagerEmail: user.pmEmail });
        const tenants = JSON.parse(data.response);
        tenants.length && setTenants(tenants);
        setTenantsLoading(false);
      }
      get();
    }
  }, [user.pmEmail]);

  /**
   * TODO refetch is not working as expected upon successful
   */
  const refetch = useCallback(async () => {
    const { data } = await axios.post("/api/get-all-tenants-for-pm", { propertyManagerEmail: user.pmEmail });
    const tenants = JSON.parse(data.response);
    tenants.length && setTenants(tenants);
  }, [user.pmEmail]);

  const customStyles = isMobile ? {} : { gridTemplateColumns: "1fr 3fr", columnGap: "2rem" };

  return (
    <div id="testing" className="mx-4 mt-4" style={{ display: "grid", ...customStyles }}>
      {!isMobile && <PortalLeftPanel />}
      <div className="lg:max-w-3xl">
        <div className={isMobile ? `` : `flex flex-row justify-between`}>
          <h1 className="text-4xl">Tenants</h1>
          <div className={`justify-self-end ${isMobile && "mt-4"}`}>
            <button
              className="bg-blue-200 mr-4 md:mt-0 p-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-36 text-center "
              onClick={() => !tenantsLoading && setAddTenantModalIsOpen(true)}
              disabled={tenantsLoading}
            >
              + New Tenant
            </button>
            <button
              className="bg-blue-200 md:mt-0 p-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-36 text-center "
              onClick={() => !tenantsLoading && setImportTenantModalIsOpen(true)}
              disabled={tenantsLoading}
            >
              Import Tenants
            </button>
          </div>
        </div>
        {!isMobile && <TenantsTable tenants={tenants} tenantsLoading={tenantsLoading} />}
        {isMobile && <TenantsCards tenants={tenants} tenantsLoading={tenantsLoading} />}
      </div>
      <AddTenantModal tenantModalIsOpen={addTenantModalIsOpen} setTenantModalIsOpen={setAddTenantModalIsOpen} onSuccessfulAdd={refetch} />
      <ImportTenantsModal modalIsOpen={importTenantModalIsOpen} setModalIsOpen={setImportTenantModalIsOpen} onSuccessfulAdd={refetch} />
      {isMobile && <BottomNavigationPanel />}
    </div>
  );
};

export default Tenants;
