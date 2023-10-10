import axios from 'axios';
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import Modal from 'react-modal';
import { useDevice } from '@/hooks/use-window-size';
import * as xlsx from 'xlsx';
import { BiError } from 'react-icons/bi';
import { LoadingSpinner } from './loading-spinner/loading-spinner';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { v4 as uuid } from 'uuid';
import { toTitleCase } from '@/utils';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import { useUserContext } from '@/context/user';
import { AiOutlineLink } from 'react-icons/ai';
import { GetS3BucketRequest } from '@/pages/api/get-s3bucket';
import { toggleBodyScroll } from '@/utils';
import { ENTITIES } from '@/database/entities';
import { CreateTenantSchema, CreateTenantSchemaType } from './add-tenant-modal';
import { z } from 'zod';
import { optionalStringCaseSensitive, validatePropertyWithId, requiredNumber } from '@/types/zodvalidators';
import { userRoles } from '@/database/entities/user';
import { EMAIL_MATCHING_ERROR } from '@/constants';

const ImportTenantSchema = CreateTenantSchema.merge(
  z.object({
    key: requiredNumber,
    error: optionalStringCaseSensitive,
  })
);
type ImportTenantSchemaType = z.infer<typeof ImportTenantSchema>;

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
  const { userType, altName } = useUserContext();
  const { isMobile } = useDevice();
  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => {
    setIsBrowser(true);
  }, []);
  isBrowser && Modal.setAppElement('#tenants');

  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      transform: 'translate(-50%, -50%)',
      width: isMobile ? '95%' : '65%',
      maxHeight: isMobile ? '80%' : '90%',
      backgroundColor: 'rgba(255, 255, 255)',
    },
    overLay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(25, 255, 255, 0.75)',
    },
  };

  const [uploadList, setUploadList] = useState<ImportTenantSchemaType[]>([]);
  const [formattingError, setFormattingError] = useState<boolean>(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
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

  const renderPreUploadTenantCard = (tenant: ImportTenantSchemaType, index: number) => {
    return (
      <div className="flex flex-row justify-between items-center w-full p-2 first:mt-0 mt-2 border-2 rounded border-slate-300" key={index}>
        <div className="flex flex-col text-gray-600 text-sm">
          <p className="font-bold">{toTitleCase(tenant.tenantName)}</p>
          <p className="mb-1">{tenant.tenantEmail}</p>
          <div>
            <p>
              {tenant.property?.address && toTitleCase(tenant.property?.address)} {tenant.property?.unit && toTitleCase(tenant.property.unit)}
            </p>
            <p>
              {tenant.property?.city && toTitleCase(tenant.property?.city)}, {tenant.property?.state && toTitleCase(tenant.property?.state)} {tenant.property?.postalCode}
            </p>
          </div>
          {tenant.error && (
            <div className="text-red-500 flex flex-row items-center">
              <BiError fontSize={30} className="mr-2" />
              {tenant.error}
            </div>
          )}
        </div>
        <div className="flex flex-row">
          <button
            className="bg-blue-200 h-7 w-7 flex items-center justify-center text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
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

  const handleFileUpload = (fileUploadEvent: React.ChangeEvent<HTMLInputElement>) => {
    setFileUploadError(null);
    setUploadList([]);
    try {
      const selectedFile: File | undefined = fileUploadEvent?.target?.files?.[0];
      //Dont handle for errors here, this triggers when user clicks upload and then cancels, which isn't an error state
      if (!selectedFile) return;

      if (selectedFile.name.endsWith('.csv')) {
        Papa.parse(selectedFile, {
          skipEmptyLines: true,
          header: true,
          complete: (result: any) => {
            processTenantFile(result.data);
          },
        });
      } else if (selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx')) {
        const reader = new FileReader();
        reader.onload = (readerEvent: ProgressEvent<FileReader>) => {
          if (!readerEvent.target?.result) {
            throw Error('Error reading .xls/.xlsx file');
          }
          const data = readerEvent.target.result;
          const workbook: xlsx.WorkBook = xlsx.read(data, { type: 'array' });
          const worksheet: xlsx.WorkSheet = workbook.Sheets[workbook.SheetNames[0]];
          const parsed = xlsx.utils.sheet_to_json(worksheet);
          if (parsed.length === 0) {
            throw Error('No data found in .xls/.xlsx file');
          }
          processTenantFile(parsed);
        };
        reader.readAsArrayBuffer(selectedFile);
      } else {
        throw Error('Unsupported file type');
      }
    } catch (error: any) {
      setFileUploadError(error?.message || 'Error uploading file');
    }
  };

  const processTenantFile = useCallback(
    async (parsed: any[]) => {
      try {
        if (
          !user ||
          !user.email ||
          !user.name ||
          userType !== userRoles.PROPERTY_MANAGER ||
          !user?.roles?.includes(ENTITIES.PROPERTY_MANAGER) ||
          !user.organization
        ) {
          alert('User must be a property manager part of an organization to import tenants');
          return;
        }
        parsed.forEach((row: any, index: number) => {
          const {
            Name: tenantName,
            Email: tenantEmail,
            Unit: unit,
            Address: address,
            City: city,
            State: state,
            'Postal Code': postalCode,
            Beds: numBeds,
            Baths: numBaths,
          } = row;

          if(tenantEmail === user.email){
            alert('You cannot add yourself as a tenant, please modify your file and try again');
            throw Error(EMAIL_MATCHING_ERROR);
          }

          //Construct error message for any missing fields
          let missingFields = '';
          if (!tenantName) missingFields += 'Name, ';
          if (!tenantEmail) missingFields += 'Email, ';
          if (!address) missingFields += 'Address, ';
          if (!city) missingFields += 'City, ';
          if (!state) missingFields += 'State, ';
          if (!postalCode) missingFields += 'Postal Code, ';
          if (!numBeds) missingFields += 'Beds, ';
          if (!numBaths) missingFields += 'Baths, ';
          if (missingFields.length) missingFields = missingFields.slice(0, -2);

          const property = validatePropertyWithId.parse({
            propertyUUId: uuid(),
            address,
            unit,
            city,
            state,
            postalCode,
            country: 'US',
            numBeds,
            numBaths,
          });

          const tenant: ImportTenantSchemaType = ImportTenantSchema.parse({
            key: index,
            tenantEmail: tenantEmail?.toLowerCase(),
            tenantName: tenantName && toTitleCase(tenantName),
            property,
            pmEmail: user.email,
            pmName: altName ?? user.name,
            createNewProperty: true,
            organization: user!.organization!,
            organizationName: user!.organizationName!,
            error: missingFields.length > 0 ? `Missing required field(s): {${missingFields}}` : undefined,
          });

          setUploadList((prev) => [...prev, tenant]);
        });
      } catch (err: any) {
        setFileUploadError(err?.message || 'Error uploading file');
      }
    },
    [setUploadList, user, altName, userType]
  );

  const handleImportTenants = async () => {
    if (!user || !user.email || userType !== userRoles.PROPERTY_MANAGER || !user.roles?.includes(ENTITIES.PROPERTY_MANAGER) || !user.organization) {
      alert('User must be a property manager in an organization to import tenants');
      return;
    }
    setImportTenantsLoading(true);
    setImportTenantProgress(0);

    let errorList: ImportTenantSchemaType[] = [];

    for (let index = 0; index < uploadList.length; index++) {
      const tenant = uploadList[index];
      const body: CreateTenantSchemaType = {
        ...tenant,
      };

      await axios
        .post('/api/create-tenant', { ...body })
        .then((res) => {
          setImportTenantProgress((prev) => prev + 1);
        })
        .catch((err) => {
          console.log(err);
          setImportTenantProgress((prev) => prev + 1);
          errorList.push({ ...tenant, error: 'Error uploading tenant' });
        });
    }

    if (!errorList.length) {
      onClose();
      toast.success(`${uploadList.length} tenants successfully created!`, {
        position: toast.POSITION.TOP_CENTER,
        draggable: false,
      });
    } else {
      toast.error(`Error uploading ${errorList.length} tenants. Please try again`, {
        position: toast.POSITION.TOP_CENTER,
        draggable: false,
      });
    }
    onSuccessfulAdd();
    setUploadList(errorList);
    setImportTenantsLoading(false);
    setImportTenantProgress(0);
  };

  const fetchFile = (fileType: 'csv' | 'xls') => async () => {
    try {
      const downloadName = `import_tenants_sample.${fileType}`;
      const res = await axios.post('/api/get-s3bucket', {
        bucket: 'pillar-file-storage',
        key: downloadName,
      } as GetS3BucketRequest);

      const downloadLink = document.createElement('a');
      downloadLink.href = res.data.response;
      downloadLink.download = downloadName;
      downloadLink.style.display = 'none';

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadLink.href);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal
      isOpen={modalIsOpen}
      onRequestClose={onClose}
      contentLabel="Import Tenants Modal"
      closeTimeoutMS={200}
      style={customStyles}
      onAfterOpen={() => toggleBodyScroll(true)}
      onAfterClose={() => toggleBodyScroll(false)}
    >
      <div className="flex flex-row items-center">
        <div className="w-full mt-1">
          <h1 className={`text-center text-lg font-bold`}>Import Tenants</h1>
        </div>
        <button
          className="bg-blue-200 h-7 w-7 flex items-center justify-center text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25"
          onClick={onClose}
        >
          X
        </button>
      </div>
      <div className="clear-right mt-6 w-full">
        <div className="mb-4 flex flex-col justify-center items-center mx-auto text-slate-500">
          <p className="text-center mb-2 ">To add tenants in bulk, upload a .csv or .xls/.xlsx file</p>
          <div className="flex flex-row items-center">
            <input
              className="text-center mx-auto w-72 py-4 pr-4"
              type="file"
              name="fileUpload"
              id="fileUpload"
              accept=".xls, .xlsx, .csv"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => {
                setUploadList([]);
                //Reset file input
                //@ts-ignore
                document.getElementById('fileUpload').value = '';
                setFileUploadError(null);
              }}
              className="text-base disabled:opacity-30 disabled:hover:cursor-auto disabled:hover:text-white disabled:hover:bg-red-400 hover:bg-red-500 h-7 w-7 flex items-center justify-center bg-red-400 hover:cursor-pointer text-white rounded-lg"
            >
              X
            </button>
          </div>
        </div>

        <div className="flex flex-row justify-center text-sm text-blue-400">
          <div
            onClick={fetchFile('csv')}
            className="flex flex-row items-center border-slate-400 pr-3 hover:cursor-pointer hover:underline"
            style={{ borderRightWidth: '1px' }}
          >
            <p>{isMobile ? 'Template csv' : 'Download csv template'}</p>
            <AiOutlineLink className="ml-1" fontSize={15} />
          </div>
          <div onClick={fetchFile('xls')} className="flex flex-row items-center pl-3 hover:cursor-pointer hover:underline">
            <p>{isMobile ? 'Template xls' : 'Download xls template'}</p>
            <AiOutlineLink className="ml-1" fontSize={15} />
          </div>
        </div>

        <div className="w-full flex flex-col mt-2">
          {uploadList.length > 0 && (
            <>
              <div className="w-full flex flex-row items-center justify-between">
                <div className="text-slate-500 text-sm">
                  Reading {uploadList.length} {uploadList.length === 1 ? 'row...' : 'rows...'}
                </div>
              </div>

              {uploadList.map((value: ImportTenantSchemaType, index: number) => {
                return renderPreUploadTenantCard(value, index);
              })}
            </>
          )}
        </div>

        {importTenantsLoading && uploadList.length > 1 && (
          <div className="bg-slate-200 w-full h-6 text-center rounded mt-4">
            <div className="absolute h-6 bg-blue-300 rounded" style={{ width: formatProgressToPercent(importTenantProgress).toString() + '%' }}></div>
            <div className="relative h-full w-full">{formatProgressToPercent(importTenantProgress)} %</div>
          </div>
        )}

        {fileUploadError && (
          <div className="w-full text-red-500 flex flex-row items-center justify-center">
            <BiError fontSize={30} className="mr-2" />
            {fileUploadError}
          </div>
        )}

        <button
          className="bg-blue-200 p-3 mt-4 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-full"
          type="submit"
          disabled={uploadList.length === 0 || formattingError || importTenantsLoading}
          onClick={() => {
            handleImportTenants();
          }}
        >
          {importTenantsLoading ? (
            <LoadingSpinner />
          ) : uploadList.length ? (
            'Create ' + uploadList.length.toString() + (uploadList.length > 1 ? ' Tenants' : ' Tenant')
          ) : (
            'Import Tenants'
          )}
        </button>
      </div>
    </Modal>
  );
};
