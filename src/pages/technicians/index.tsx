
import { PortalLeftPanel } from '@/components/portal-left-panel';
import TechnicianTable from './technician-table';
import { useCallback, useEffect, useState } from 'react';
import { AddTechnicianModal } from '@/components/add-technician-modal';
import axios from 'axios';
import { ITechnician } from '@/database/entities/technician';
import { useDevice } from '@/hooks/use-window-size';
import { BottomNavigationPanel } from '@/components/bottom-navigation-panel';
import { TechnicianCards } from './technician-cards';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';

const Technicians = () => {
  const [technicianModalIsOpen, setTenantModalIsOpen] = useState(false);
  const { user } = useSessionUser();
  const { userType } = useUserContext();
  const { isMobile } = useDevice();
  const [technicians, setTechnicians] = useState<ITechnician[]>([]);

  useEffect(() => {
    async function get() {
      if (!user?.email || userType !== "PROPERTY_MANAGER") return;
      const { data } = await axios.post("/api/get-all-technicians-for-pm", { pmEmail: user.email });
      if (data.response) {
        const techs: ITechnician[] = JSON.parse(data.response);
        techs.length && setTechnicians(techs);
      }
    }
    get();
  }, [user, userType]);

  const refetch = useCallback(async () => {
    if (!user?.email || userType !== "TECHNICIAN") return;
    const { data } = await axios.post("/api/get-all-technicians-for-pm", { propertyManagerEmail: user.pmEmail });
    const techs = JSON.parse(data.response);
    techs.length && setTechnicians(techs);
  }, [user, userType]);

  const customStyles = isMobile ? {} : { display: "grid", gridTemplateColumns: "1fr 3fr", columnGap: "2rem" };

  return (
    <div id="testing" className="mx-4 mt-4" style={{ ...customStyles }}>
      {!isMobile && <PortalLeftPanel />}
      <div className="lg:max-w-5xl">
        <div style={isMobile ? {} : { display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <h1 className="text-4xl">{`Technicians`}</h1>
          <button
            className="bg-blue-200 mt-2 md:mt-0 p-2 mb-auto text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-40 justify-self-end text-center"
            onClick={() => setTenantModalIsOpen(true)}
          >+ Add Technician</button>
        </div>
        {!isMobile && <TechnicianTable technicians={technicians} />}
        {isMobile && <TechnicianCards technicians={technicians} />}
      </div>
      <AddTechnicianModal technicianModalIsOpen={technicianModalIsOpen} setTechnicianModalIsOpen={setTenantModalIsOpen} onSuccessfulAdd={refetch} />
      {isMobile && <BottomNavigationPanel />}
    </div >
  );
};

export default Technicians;