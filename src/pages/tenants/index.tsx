import { useUserContext } from "@/context/user";
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import axios from "axios";
import { AddTenantModal } from '@/components/add-tenant-modal';
import { toTitleCase } from '@/utils';
import { PortalLeftPanel } from '@/components/portal-left-panel';
import { useDevice } from "@/hooks/use-window-size";
import { BottomNavigationPanel } from "@/components/bottom-navigation-panel";
import { TenantsTable } from "@/components/tenants-table";
import TenantsCards from "./tenant-cards";

const Tenants = () => {
  const [tenantModalIsOpen, setTenantModalIsOpen] = useState(false);
  const { user } = useUserContext();
  const [tenants, setTenants] = useState([]);
  const { isMobile } = useDevice();


  useEffect(() => {
    if (user.pmEmail) {
      async function get() {
        const { data } = await axios.post("/api/get-all-tenants-for-pm", { propertyManagerEmail: user.pmEmail });
        const tenants = JSON.parse(data.response);
        tenants.length && setTenants(tenants);
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
        <div style={isMobile ? {} : { display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <h1 className="text-4xl">Tenants</h1>
          <button
            className="bg-blue-200 mt-2 md:mt-0 p-2 mb-auto text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-40 justify-self-end text-center "
            onClick={() => setTenantModalIsOpen(true)}
          >+ New Tenant</button>
        </div>
        {!isMobile && <TenantsTable tenants={tenants} />}
        {isMobile && <TenantsCards />}
      </div>
      <AddTenantModal tenantModalIsOpen={tenantModalIsOpen} setTenantModalIsOpen={setTenantModalIsOpen} onSuccessfulAdd={refetch} />
      {isMobile && <BottomNavigationPanel />}
    </div >
  );
};

export default Tenants;