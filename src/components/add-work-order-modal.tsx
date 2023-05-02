import { useUserContext } from "@/context/user";
import axios from "axios";
import { Dispatch, FormEventHandler, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { IProperty } from "@/database/entities/property";
import Select from "react-select";

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    transform: 'translate(-50%, -50%)',
    width: "90%",
    height: "80%",
    backgroundColor: 'rgba(255, 255, 255)'
  },
  overLay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(25, 255, 255, 0.75)'
  }
};

export const AddWorkOrderModal = ({ workOrderModalIsOpen, setWorkOrderModalIsOpen, onSuccessfulAdd }: { workOrderModalIsOpen: boolean; setWorkOrderModalIsOpen: Dispatch<SetStateAction<boolean>>; onSuccessfulAdd: () => void; }) => {

  const { user } = useUserContext();
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  isBrowser && Modal.setAppElement('#workOrder');

  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [address, setAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [properties, setProperties] = useState<IProperty[]>([]);

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<IProperty | null>(null);

  function closeModal() {
    setWorkOrderModalIsOpen(false);
  }

  useEffect(() => {
    async function getProperties() {
      const { data } = await axios.post('/api/get-all-properties-for-pm', {
        propertyManagerEmail: user.pmEmail,
      });
      if (data.response) {
        const parsed: IProperty[] = JSON.parse(data.response);
        setProperties(parsed);
      }
    }
    getProperties();
  }, [user.pmEmail]);

  const handleCreateWorkOrder: FormEventHandler<HTMLFormElement> = useCallback(async (event) => {
    try {
      event.preventDefault();
      if (!user.pmEmail) {
        throw new Error("user needs to be a Property Manager.");
      }
      // const { data } = await axios.post("/api/sent-wo", {
      //   tenantEmail,
      //   tenantName,
      //   pmEmail: user.pmEmail,
      //   organization: user.organization ?? "",
      //   address,
      //   unit,
      //   state,
      //   city,
      //   postalCode,
      // });
      // const { response } = data;
      // const parsedUser = JSON.parse(response);
      // if (parsedUser.modified) {
      //   toast.success("Work Order Created");
      //   onSuccessfulAdd();
      //   setWorkOrderModalIsOpen(false);
      // }
    } catch (err) {
      console.log({ err });
    }
  }, [
    user,
    onSuccessfulAdd,
    tenantEmail,
    tenantName,
    setWorkOrderModalIsOpen,
    address,
    unit,
    state,
    city,
    postalCode
  ]);

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

  const addressOptions = Array.from(addressSet).map(a => ({ value: a, label: a }));
  const unitOptions = Array.from(unitSet).map(a => ({ value: a, label: a }));
  const stateOptions = Array.from(stateSet).map(a => ({ value: a, label: a }));
  const cityOptions = Array.from(citySet).map(a => ({ value: a, label: a }));
  const zipOptions = Array.from(zipSet).map(a => ({ value: a, label: a }));

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
    <Modal
      isOpen={workOrderModalIsOpen}
      onAfterOpen={() => { }}
      onRequestClose={closeModal}
      contentLabel="Example Modal"
      closeTimeoutMS={200}
      style={customStyles}
    >
      <button
        className="w-full text-right"
        onClick={closeModal}>X Close</button>

      <form onSubmit={handleCreateWorkOrder} style={{ display: "grid" }}>
        {!selectedProperty && (
          <>
            <label className='mt-5' htmlFor='address'>Street Address* </label>
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
              options={addressOptions as { value: string; label: string; }[]}
            />
            <label className='mt-5' htmlFor='address'>Unit </label>
            <Select
              className="basic-single"
              classNamePrefix="select"
              defaultValue={undefined}
              isLoading={false}
              isClearable={true}
              onChange={(v) => setSelectedUnit(v?.value ?? null)}
              isSearchable={true}
              name="unit"
              options={unitOptions as { value: string; label: string; }[]}
            />
            <label className='mt-5' htmlFor='state'>State* </label>
            <Select
              className="basic-single"
              classNamePrefix="select"
              defaultValue={undefined}
              isLoading={false}
              isClearable={true}
              onChange={(v) => setSelectedState(v?.value ?? null)}
              isSearchable={true}
              name="state"
              options={stateOptions as { value: string; label: string; }[]}
            />
            <label className='mt-5' htmlFor='city'>City* </label>
            <Select
              className="basic-single"
              classNamePrefix="select"
              defaultValue={undefined}
              isLoading={false}
              isClearable={true}
              onChange={(v) => setSelectedCity(v?.value ?? null)}
              isSearchable={true}
              name="city"
              options={cityOptions as { value: string; label: string; }[]}
            />
            <label className='mt-5' htmlFor='postalCode'>Zip* </label>
            <Select
              className="basic-single"
              classNamePrefix="select"
              defaultValue={undefined}
              isLoading={false}
              isClearable={true}
              onChange={(v) => setSelectedZip(v?.value ?? null)}
              isSearchable={true}
              name="zip"
              options={zipOptions as { value: string; label: string; }[]}
            />
          </>
        )}
        <label className='mt-5' htmlFor='postalCode'>{selectedProperty ? "Selected Property:" : `Select Property* `}</label>
        {!selectedProperty && filteredOptions.map(o => {
          return (
            <div
              key={o.pk + o.sk}
              onClick={() => setSelectedProperty(o)}
              className="bg-gray-200 rounded mt-1 p-1"
            >
              <p className="text-sm text-gray-800">{o.address.trim() + " " + o.unit} </p>
              <p className="text-sm font-light">{o.city + ", " + o.state + " " + o.postalCode} </p>
            </div>);
        })}
        {selectedProperty && (
          <div>
            <p>{selectedProperty.address}</p>
            <button
              className="bg-slate-200 py-1 px-2 rounded"
              onClick={() => setSelectedProperty(null)}>Select Other Property</button>

          </div>)
        }

        <button
          className="bg-blue-200 p-3 mt-7 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          type="submit"
          disabled={!tenantName || !tenantEmail || !address || !state || !city || !postalCode}
        >
          Add Work Order
        </button>
      </form>
    </Modal >
  );
};