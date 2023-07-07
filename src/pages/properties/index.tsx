import { useUserContext } from "@/context/user";
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import axios from "axios";

import { toTitleCase } from '@/utils';
import { PortalLeftPanel } from '@/components/portal-left-panel';
import { useDevice } from "@/hooks/use-window-size";
import { BottomNavigationPanel } from "@/components/bottom-navigation-panel";
import { PropertiesTable } from "@/components/properties-table";
import { AddPropertyModal } from "@/components/add-property-modal";

const Tenants = () => {
  const [addPropetyModalIsOpen, setAddPropertyModalIsOpen
  ] = useState(false);
  const { user } = useUserContext();
  const [properties, setProperties] = useState([]);
  const { isMobile } = useDevice();
  const router = useRouter();



  /**
   * TODO refetch is not working as expected upon successful
   */
  const refetch = useCallback(async () => {
    const { data } = await axios.post("/api/get-all-properties-for-pm", { propertyManagerEmail: user.pmEmail });
    const properties = JSON.parse(data.response);
    properties.length && setProperties(properties);
  }, [user.pmEmail]);

  const customStyles = isMobile ? {} : { gridTemplateColumns: "1fr 3fr", columnGap: "2rem" };

  return (
    <div id="testing" className="mx-4 mt-4" style={{ display: "grid", ...customStyles }}>
      {!isMobile && <PortalLeftPanel />}
      <div className="lg:max-w-3xl">
        <div style={isMobile ? {} : { display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <h1 className="text-4xl">Properties</h1>
          <button
            className="bg-blue-200 mt-2 md:mt-0 p-2 mb-auto text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-40 justify-self-end text-center "
            onClick={() => setAddPropertyModalIsOpen
              (true)}
          >+ New Property</button>
        </div>
        {!isMobile && <PropertiesTable />}
        {/* {isMobile && <TenantsCards />} */}
      </div>
      <AddPropertyModal
        addPropetyModalIsOpen={addPropetyModalIsOpen}
        setAddPropertyModalIsOpen={setAddPropertyModalIsOpen}
      />
      {isMobile && <BottomNavigationPanel />}
    </div >
  );
};

export default Tenants;