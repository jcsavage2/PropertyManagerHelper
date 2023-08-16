import { useCallback, useEffect, useState } from 'react';
import axios from "axios";
import { AddTenantModal } from '@/components/add-tenant-modal';
import { PortalLeftPanel } from '@/components/portal-left-panel';
import { useDevice } from "@/hooks/use-window-size";
import { BottomNavigationPanel } from "@/components/bottom-navigation-panel";
import { TenantsTable } from "@/components/tenants-table";
import TenantsCards from "./tenant-cards";
import { useSessionUser } from "@/hooks/auth/use-session-user";
import { GetTenantsForPropertyManagerApiRequest } from '../api/get-all-tenants-for-pm';

const Tenants = () => {
  const [tenantModalIsOpen, setTenantModalIsOpen] = useState(false);
  const { user } = useSessionUser();
  const [tenants, setTenants] = useState([]);
  const { isMobile } = useDevice();

  /**
   * TODO refetch is not working as expected upon successful
   */
  const fetchTenants = useCallback(async () => {
    if (!user) return;
    const body: GetTenantsForPropertyManagerApiRequest = { pmEmail: user.email };
    const { data } = await axios.post("/api/get-all-tenants-for-pm", body);
    const tenants = JSON.parse(data.response);
    tenants.length && setTenants(tenants);
  }, [user?.email]);

  useEffect(() => {
    fetchTenants();
  }, [user]);

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
        {isMobile ? <TenantsCards /> : <TenantsTable tenants={tenants} />}
      </div>
      <AddTenantModal tenantModalIsOpen={tenantModalIsOpen} setTenantModalIsOpen={setTenantModalIsOpen} onSuccessfulAdd={fetchTenants} />
      {isMobile && <BottomNavigationPanel />}
    </div >
  );
};

export default Tenants;