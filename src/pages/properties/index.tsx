import { PortalLeftPanel } from "@/components/portal-left-panel";
import { PropertiesTable } from "@/components/properties-table";
import { AddPropertyModal } from "@/components/add-property-modal";
import { useState } from "react";
import { useDevice } from "@/hooks/use-window-size";
import { BottomNavigationPanel } from "@/components/bottom-navigation-panel";

const Properties = () => {
  const [addPropteryModalIsOpen, setAddPropteryModalIsOpen] = useState(false);
  const { isMobile } = useDevice();

  const customStyle = isMobile ? {} : { gridTemplateColumns: "1fr 3fr", columnGap: "2rem" };

  return (
    <div id="property" className="mx-4 mt-4" style={{ display: "grid", ...customStyle }}>
      {!isMobile && <PortalLeftPanel />}
      <div className="lg:max-w-5xl">
        <div style={isMobile ? {} : { display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <h1 className="text-4xl">Properties</h1>
          <button
            onClick={() => setAddPropteryModalIsOpen(true)}
            className="bg-blue-200 mt-2 md:mt-0 p-2 mb-auto text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-40 justify-self-end text-center"
          >+ New Property</button>
        </div>
        <PropertiesTable />
      </div>
      {isMobile && <BottomNavigationPanel />}
      <AddPropertyModal addPropetyModalIsOpen={addPropteryModalIsOpen} setAddPropertyModalIsOpen={setAddPropteryModalIsOpen} />
    </div>
  );
};

export default Properties;