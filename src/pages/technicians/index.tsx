
import { PortalLeftPanel } from '@/components/portal-left-panel';
import TechnicianTable from './technician-table';
import { useCallback, useEffect, useState } from 'react';
import { AddTechnicianModal } from '@/components/add-technician-modal';
import { useUserContext } from '@/context/user';
import axios from 'axios';
import { ITechnician } from '@/database/entities/technician';

const Technicians = () => {
  const [technicianModalIsOpen, setTenantModalIsOpen] = useState(false);
  const { user } = useUserContext();
  const [technicians, setTechnicians] = useState<ITechnician[]>([]);

  useEffect(() => {
    async function get() {
      if (!user.pmEmail) {
        return;
      }
      const { data } = await axios.post("/api/get-all-technicians-for-pm", { propertyManagerEmail: user.pmEmail });
      const techs: ITechnician[] = JSON.parse(data.response);
      techs.length && setTechnicians(techs);
    }
    get();
  }, [user.pmEmail]);

  const refetch = useCallback(async () => {
    if(!user.pmEmail){
        return
    }
    const { data } = await axios.post("/api/get-all-technicians-for-pm", { propertyManagerEmail: user.pmEmail });
    const techs = JSON.parse(data.response);
    techs.length && setTechnicians(techs);
  }, [user.pmEmail]);

  return (
    <div id="testing" className="mx-4 mt-4" style={{ display: "grid", gridTemplateColumns: "1fr 3fr", columnGap: "2rem" }}>
      <PortalLeftPanel />
      <div className="lg:max-w-5xl">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <h1 className="text-4xl">{`Technicians`}</h1>
          <button
            className="bg-blue-200 p-2 mb-auto text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-40 justify-self-end text-center"
            onClick={() => setTenantModalIsOpen(true)}
          >+ Add Technician</button>
        </div>
        <TechnicianTable technicians={technicians} />
      </div>
      <AddTechnicianModal technicianModalIsOpen={technicianModalIsOpen} setTechnicianModalIsOpen={setTenantModalIsOpen} onSuccessfulAdd={refetch} />
    </div>
  );
};

export default Technicians;