import axios from "axios";
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";
import Modal from "react-modal";
import { useDevice } from "@/hooks/use-window-size";
import * as xlsx from "xlsx";
import { BiError } from "react-icons/bi";
import { CreateTenantBody } from "@/pages/api/create-tenant";
import { LoadingSpinner } from "./loading-spinner/loading-spinner";
import { useSessionUser } from "@/hooks/auth/use-session-user";
import { v4 as uuid } from "uuid";
import { toTitleCase } from "@/utils";
import { toast } from "react-toastify";

type ImportTenantObject = CreateTenantBody & {
  key: number;
  error?: string;
};

export const ImportTenantsModal = ({
  modalIsOpen,
  setModalIsOpen,
  onSuccessfulAdd,
}: {
  modalIsOpen: boolean;
  setModalIsOpen: Dispatch<SetStateAction<boolean>>;
  onSuccessfulAdd: () => void;
}) => {
  const { user } = useSessionUser();
  const { isMobile } = useDevice();
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  isBrowser && Modal.setAppElement("#testing");

  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      transform: "translate(-50%, -50%)",
      width: isMobile ? "85%" : "65%",
      maxHeight: isMobile ? "80%" : "90%",
      backgroundColor: "rgba(255, 255, 255)",
    },
    overLay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(25, 255, 255, 0.75)",
    },
  };

  const [uploadList, setUploadList] = useState<ImportTenantObject[]>([]);
  const [formattingError, setFormattingError] = useState<boolean>(false);
  const [importTenantsLoading, setImportTenantsLoading] = useState<boolean>(false);
  const [importTenantProgress, setImportTenantProgress] = useState<number>(0);

  const onClose = () => {
    setUploadList([]);
    setModalIsOpen(false);
    setFormattingError(false);
  };

  const formatProgressToPercent = (progress: number) => {
    if (progress === 0) return 0;
    return Math.round((progress / uploadList.length) * 100);
  };

  useEffect(() => {
    if (uploadList.length > 0) {
      setFormattingError(uploadList.some((tenant) => !!tenant.error));
    } else {
      setFormattingError(false);
    }
  }, [uploadList]);

  const renderPreUploadTenantCard = (tenant: ImportTenantObject, index: number) => {
    return (
      <div className="flex flex-row justify-between items-center w-full p-2 first:mt-0 mt-2 border-2 rounded border-slate-300" key={index}>
        <div className="flex flex-col text-gray-600 text-sm">
          <p className="font-bold">{tenant.tenantName}</p>
          <p className="mb-1">{tenant.tenantEmail}</p>
          {!tenant.error ? (
            <div>
              <p>
                {tenant.address} {tenant.unit && tenant.unit}
              </p>
              <p>
                {tenant.city}, {tenant.state} {tenant.postalCode}
              </p>
            </div>
          ) : (
            <div className="text-red-500 flex flex-row items-center">
              <BiError fontSize={30} className="mr-2" />
              {tenant.error}
            </div>
          )}
        </div>
        <div className="flex flex-row">
          <button
            className="bg-blue-200 px-2 py-1 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
            onClick={() => {
              setUploadList((prev) => prev.filter((t) => t.key !== tenant.key));
            }}
          >
            X
          </button>
        </div>
      </div>
    );
  };

  const handleFileUpload = (event: any) => {
    setUploadList([]);
    setFormattingError(false);
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (!e.target?.result) {
        return;
      }
      const data = e.target.result;
      const workbook: xlsx.WorkBook = xlsx.read(data, { type: "array" });
      const worksheet: xlsx.WorkSheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = xlsx.utils.sheet_to_json(worksheet);
      if (parsed.length === 0) {
        return;
      }
      processExcelData(parsed);
    };
    if (!event.target.files[0]) {
      return;
    }
    reader.readAsArrayBuffer(event.target.files[0]);
  };

  const processExcelData = useCallback(
    async (parsed: any[]) => {
      if (!user || !user.pmEmail) return;
      parsed.forEach((row: any, index: number) => {
        const { NAME: tenantName, UNIT: unit, EMAIL: tenantEmail, ADDRESS: address, CITY: city, STATE: state, "POSTAL CODE": postalCode, "BEDS": numBeds, "BATHS": numBaths } = row;

        //Construct error message for any missing fields
        let missingFields = "";
        if (!tenantName) missingFields += "NAME, ";
        if (!tenantEmail) missingFields += "EMAIL, ";
        if (!address) missingFields += "ADDRESS, ";
        if (!city) missingFields += "CITY, ";
        if (!state) missingFields += "STATE, ";
        if (!postalCode) missingFields += "POSTAL CODE, ";
        if (!numBeds) missingFields += "BEDS, ";
        if (!numBaths) missingFields += "BATHS, ";
        if (missingFields.length) missingFields = missingFields.slice(0, -2);

        const tenant: ImportTenantObject = {
          key: index,
          tenantEmail: tenantEmail?.toLowerCase(),
          tenantName: tenantName && toTitleCase(tenantName),
          address,
          city,
          state,
          postalCode: postalCode?.toString(),
          unit: unit?.toString(),
          country: "US",
          pmEmail: user!.pmEmail!,
          numBeds,
          numBaths,
          createNewProperty: true,
          propertyUUId: uuid(),
          error: missingFields.length > 0 ? `Missing required field(s): {${missingFields}}` : undefined,
        };
        setUploadList((prev) => [...prev, tenant]);
      });
    },
    [setUploadList, user]
  );

  const handleImportTenants = async () => {
    if (!user || !user.pmEmail) return;
    setImportTenantsLoading(true);
    setImportTenantProgress(0);

    let errorList: ImportTenantObject[] = []

    // Loop through the uploadList
    for (let index = 0; index < uploadList.length; index++) {
      const tenant = uploadList[index];
      const body: CreateTenantBody = {
        ...tenant,
        country: "US",
      };

      await axios.post("/api/create-tenant", { ...body }).then((res) => {
        setImportTenantProgress((prev) => prev + 1);
      }).catch((err) => {
        console.log(err);
        setImportTenantProgress((prev) => prev + 1);
        errorList.push({...tenant, error: "Error uploading tenant"})
      })
    }
    
    if(!errorList.length){
      onClose();
      toast.success(`${uploadList.length} tenants successfully created!`, {
        position: toast.POSITION.TOP_CENTER,
      });
    }else{
      toast.error(`Error uploading ${errorList.length} tenants. Please try again`, {
        position: toast.POSITION.TOP_CENTER,
      });
    }
    onSuccessfulAdd();
    setUploadList(errorList);
    setImportTenantsLoading(false);
    setImportTenantProgress(0);
  }

  return (
    <Modal
      isOpen={modalIsOpen}
      onAfterOpen={() => {}}
      onRequestClose={onClose}
      contentLabel="Example Modal"
      closeTimeoutMS={200}
      style={customStyles}
    >
      <button className="float-right bg-blue-200 px-2 py-1 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25" onClick={onClose}>
        X
      </button>
      <div className="w-full mt-1">
        <h1 className={`text-center text-lg font-bold`}>Import Tenants</h1>
      </div>

      <div className="clear-right mt-4">
        <div className="mb-4 flex flex-col justify-center ">
          <p className="text-center text-slate-500 mb-2">Upload a .xls/.xlsx file to bulk import tenants</p>
          <input className="mx-auto md:w-auto w-3/4" type="file" name="xlsFile" id="xlsFile" accept=".xls, .xlsx" onChange={(e) => handleFileUpload(e)} />
        </div>

        <div className="w-full flex flex-col">
          {uploadList.length > 0 && (
            <>
              <div className="text-slate-500 text-sm">
                Reading {uploadList.length} {uploadList.length === 1 ? "row..." : "rows..."}
              </div>
              {uploadList.map((value: ImportTenantObject, index: number) => {
                return renderPreUploadTenantCard(value, index);
              })}
            </>
          )}
        </div>

        {importTenantsLoading && uploadList.length > 1 && (
          <div className="bg-slate-200 w-full h-6 text-center rounded mt-4">
            <div className="absolute h-6 bg-blue-300 rounded" style={{ width: formatProgressToPercent(importTenantProgress).toString() + "%" }}></div>
            <div className="relative h-full w-full">{formatProgressToPercent(importTenantProgress)} %</div>
          </div>
        )}

        <button
          className="bg-blue-200 p-3 mt-4 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-full"
          type="submit"
          disabled={uploadList.length === 0 || formattingError || importTenantsLoading}
          onClick={() => {
            setImportTenantsLoading(true);
            handleImportTenants();
          }}
        >
          {importTenantsLoading ? (
            <LoadingSpinner />
          ) : uploadList.length ? (
            "Create " + uploadList.length.toString() + (uploadList.length > 1 ? " Tenants" : " Tenant")
          ) : (
            "Import Tenants"
          )}
        </button>
      </div>
    </Modal>
  );
};
