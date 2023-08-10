import { IProperty } from "@/database/entities/property";
import axios from "axios";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Select from "react-select";
import { LoadingSpinner } from "./loading-spinner/loading-spinner";

const PropertySelector = ({
  selectedProperty,
  setSelectedProperty,
  email,
}: {
  selectedProperty: IProperty | null;
  setSelectedProperty: Dispatch<SetStateAction<IProperty | null>>;
  email: string;
}) => {
  const [properties, setProperties] = useState<IProperty[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function getProperties() {
      if (!email || !email.length) {
        return;
      }
      setLoading(true);

      const { data } = await axios.post("/api/get-all-properties-for-pm", {
        propertyManagerEmail: email,
      });
      if (data.response) {
        const parsed: IProperty[] = JSON.parse(data.response);
        setProperties(parsed);
      }
      setLoading(false);
    }
    getProperties();
  }, [email]);

  const addressSet = new Set();
  const unitSet = new Set();
  const citySet = new Set();
  const stateSet = new Set();
  const zipSet = new Set();
  for (const property of properties) {
    unitSet.add(property.unit);
    addressSet.add(property.address);
    citySet.add(property.city);
    stateSet.add(property.state);
    zipSet.add(property.postalCode);
  }

  const addressOptions = Array.from(addressSet).map((a) => ({ value: a, label: a }));
  const unitOptions = Array.from(unitSet).map((a) => ({ value: a, label: a }));
  const stateOptions = Array.from(stateSet).map((a) => ({ value: a, label: a }));
  const cityOptions = Array.from(citySet).map((a) => ({ value: a, label: a }));
  const zipOptions = Array.from(zipSet).map((a) => ({ value: a, label: a }));

  const filteredOptions = properties.reduce((acc: IProperty[], curr) => {
    if (selectedAddress && curr.address !== selectedAddress) {
      return acc;
    }
    if (selectedCity && curr.city !== selectedCity) {
      return acc;
    }
    if (selectedUnit && curr.unit !== selectedUnit) {
      return acc;
    }
    if (selectedState && curr.state !== selectedState) {
      return acc;
    }
    if (selectedZip && curr.postalCode !== selectedZip) {
      return acc;
    }
    return [...acc, curr];
  }, []);

  return (
    <div className={`mt-2 mx-auto ${!selectedProperty ? "w-full" : "w-1/2"}`}>
      {!selectedProperty && (
        <div className="w-full">
          <label className="mt-5" htmlFor="address">
            Street Address*{" "}
          </label>
          <Select
            className="basic-single"
            classNamePrefix="select"
            defaultValue={undefined}
            isLoading={false}
            isClearable={true}
            //@ts-ignore
            onChange={(v) => setSelectedAddress(v?.value ?? null)}
            isSearchable={true}
            name="address"
            options={addressOptions as { value: string; label: string }[]}
          />
          <label className="mt-5" htmlFor="address">
            Unit{" "}
          </label>
          <Select
            className="basic-single"
            classNamePrefix="select"
            defaultValue={undefined}
            isLoading={false}
            isClearable={true}
            onChange={(v) => setSelectedUnit(v?.value ?? null)}
            isSearchable={true}
            name="unit"
            options={unitOptions as { value: string; label: string }[]}
          />
          <label className="mt-5" htmlFor="state">
            State*{" "}
          </label>
          <Select
            className="basic-single"
            classNamePrefix="select"
            defaultValue={undefined}
            isLoading={false}
            isClearable={true}
            onChange={(v) => setSelectedState(v?.value ?? null)}
            isSearchable={true}
            name="state"
            options={stateOptions as { value: string; label: string }[]}
          />
          <label className="mt-5" htmlFor="city">
            City*{" "}
          </label>
          <Select
            className="basic-single"
            classNamePrefix="select"
            defaultValue={undefined}
            isLoading={false}
            isClearable={true}
            onChange={(v) => setSelectedCity(v?.value ?? null)}
            isSearchable={true}
            name="city"
            options={cityOptions as { value: string; label: string }[]}
          />
          <label className="mt-5" htmlFor="postalCode">
            Zip*{" "}
          </label>
          <Select
            className="basic-single mb-4"
            classNamePrefix="select"
            defaultValue={undefined}
            isLoading={false}
            isClearable={true}
            onChange={(v) => setSelectedZip(v?.value ?? null)}
            isSearchable={true}
            name="zip"
            options={zipOptions as { value: string; label: string }[]}
          />
        </div>
      )}
      <div className="flex flex-row items-center justify-center mb-2 mt-4">
        <p className="font-bold mr-2"> {selectedProperty ? `Selected Property: ` : `Select Property* `} </p>
        {selectedProperty && (
          <p>
            {selectedProperty.address} {selectedProperty.unit}
          </p>
        )}
      </div>

      {loading && !selectedProperty ? (
        <LoadingSpinner containerClass={null} />
      ) : (
        <>
          {!selectedProperty
            ? filteredOptions.map((o: IProperty) => {
                return (
                  <div key={o.pk + o.sk} onClick={() => setSelectedProperty(o)} className="bg-gray-200 rounded mt-1 p-1 cursor-pointer">
                    <p className="text-sm text-gray-800">
                      {o.address.trim()} {o.unit ? " " + o.unit : ""}
                    </p>
                    <p className="text-sm font-light">{o.city + ", " + o.state + " " + o.postalCode}</p>
                  </div>
                );
              })
            : null}
        </>
      )}

      {selectedProperty && (
        <button className="bg-slate-200 py-1 px-2 rounded w-full hover:bg-slate-300" onClick={() => setSelectedProperty(null)}>
          Select Other Property
        </button>
      )}
    </div>
  );
};

export default PropertySelector;
