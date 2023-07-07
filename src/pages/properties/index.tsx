import { useUserContext } from "@/context/user";
import { useCallback, useEffect, useState } from 'react';
import axios from "axios";

import { toTitleCase } from '@/utils';
import { PortalLeftPanel } from '@/components/portal-left-panel';
import { useDevice } from "@/hooks/use-window-size";
import { BottomNavigationPanel } from "@/components/bottom-navigation-panel";
import { PropertiesTable } from "@/components/properties-table";
import { AddPropertyModal } from "@/components/add-property-modal";
import React from "react";
import { PartialProperty, useSortableData } from "@/hooks/use-sortable-data";
import { IProperty } from "@/database/entities/property";



const Properties = () => {
  const { user } = useUserContext();
  const [addPropetyModalIsOpen, setAddPropertyModalIsOpen] = useState(false);
  const [properties, setProperties] = useState<PartialProperty[]>([]);
  const { isMobile } = useDevice();

  const [query, setQuery] = useState<string>("");
  const { items, requestSort, sortConfig } = useSortableData(properties);

  useEffect(() => {
    if (user.pmEmail) {
      async function get() {
        try {
          const { data } = await axios.post("/api/get-all-properties-for-pm", { propertyManagerEmail: user.pmEmail });
          const properties = JSON.parse(data.response) as IProperty[];
          const partialProperties: PartialProperty[] = properties.map((p) => ({
            address: p.address ?? "",
            city: p.city ?? "",
            state: p.state ?? "",
            postalCode: p.postalCode ?? "",
            unit: p.unit ?? ""
          }));
          partialProperties.length && setProperties(partialProperties);
        } catch (e) {
          console.log({ e });
        }
      }
      get();
    }
  }, [user.pmEmail]);



  useEffect(() => {
    setProperties(items);
  }, []);

  const filteredData = items?.filter((item) =>
    //@ts-ignore
    Object.keys(item).some((key: keyof PartialProperty) =>
      String(item[key]).toLowerCase().includes(query.toLowerCase())
    )
  );

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
        <input
          className="mt-4"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter..."
        />

        {items.length && !isMobile && (
          <PropertiesTable sortConfig={sortConfig} items={items} requestSort={requestSort} filteredData={filteredData} />
        )}
        {items.length && isMobile && (
          <PropertiesTable sortConfig={sortConfig} items={items} requestSort={requestSort} filteredData={filteredData} />
        )}
      </div>
      <AddPropertyModal
        addPropetyModalIsOpen={addPropetyModalIsOpen}
        setAddPropertyModalIsOpen={setAddPropertyModalIsOpen}
      />
      {isMobile && <BottomNavigationPanel />}
    </div>
  );

};

export default Properties;