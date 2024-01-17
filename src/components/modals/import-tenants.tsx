import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useDevice } from '@/hooks/use-window-size';
import * as xlsx from 'xlsx';
import { BiError } from 'react-icons/bi';
import { LoadingSpinner } from '../loading-spinner';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { v4 as uuid } from 'uuid';
import { deconstructKey, renderToastError, renderToastSuccess, toTitleCase } from '@/utils';
import Papa from 'papaparse';
import { useUserContext } from '@/context/user';
import { AiOutlineLink } from 'react-icons/ai';
import { ENTITIES } from '@/database/entities';
import { validatePropertyWithId } from '@/types/basevalidators';
import { USER_TYPE } from '@/database/entities/user';
import { USER_PERMISSION_ERROR } from '@/constants';
import { ImportTenantSchema } from '@/types/customschemas';
import { CreateTenant, ImportTenant } from '@/types';
import { CiWarning } from 'react-icons/ci';
import Modal from '../modal';

const modalId = 'import-tenants-modal';

export const ImportTenantsModal = ({ onSuccessfulAdd }: { onSuccessfulAdd: () => void }) => {
  const { user } = useSessionUser();
  const { userType, altName } = useUserContext();
  const { isMobile } = useDevice();

  const [uploadList, setUploadList] = useState<ImportTenant[]>([]);
  const [formattingError, setFormattingError] = useState<boolean>(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [importTenantsLoading, setImportTenantsLoading] = useState<boolean>(false);
  const [preImportTenantsLoading, setPreImportTenantsLoading] = useState<boolean>(false);
  const [importTenantProgress, setImportTenantProgress] = useState<number>(0);

  const closeModal = () => {
    setUploadList([]);
    setFormattingError(false);
    (document.getElementById(modalId) as HTMLFormElement)?.close();
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

  const renderPreUploadTenantCard = (tenant: ImportTenant, index: number) => {
    return (
      <div className="flex flex-row justify-between items-center w-full p-2 first:mt-0 mt-2 border-2 rounded border-slate-300" key={index}>
        <div className="flex flex-col text-gray-600 text-sm">
          <p className="font-bold">{toTitleCase(tenant.tenantName ?? '')}</p>
          <p className="mb-1">{tenant.tenantEmail}</p>
          <div>
            <p>
              {tenant.property?.address && toTitleCase(tenant.property?.address)} {tenant.property?.unit && toTitleCase(tenant.property.unit)}
            </p>
            <p>
              {tenant.property?.city && toTitleCase(tenant.property?.city)}, {tenant.property?.state && tenant.property?.state.toUpperCase()} {tenant.property?.postalCode}
            </p>
          </div>
          {tenant.error && (
            <div className="text-error flex flex-row items-center">
              <BiError fontSize={30} className="mr-2" />
              {tenant.error}
            </div>
          )}
          {tenant.warning && (
            <div className="text-yellow-500 flex flex-row items-center">
              <CiWarning fontSize={30} className="mr-2" />
              {tenant.warning}
            </div>
          )}
        </div>
        <div className="flex flex-row">
          <button
            className="btn btn-square btn-sm btn-secondary"
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
      setPreImportTenantsLoading(true);
      try {
        if (!user || !user.email || !user.name || userType !== USER_TYPE.PROPERTY_MANAGER || !user?.roles?.includes(ENTITIES.PROPERTY_MANAGER) || !user.organization) {
          alert('User must be a property manager part of an organization to import tenants');
          return;
        }
        let index = 0;
        for (const row of parsed) {
          const {
            Name: tenantName,
            Email: tenantEmail,
            Unit: _unit,
            Address: address,
            City: city,
            State: state,
            'Postal Code': _postalCode,
            Beds: numBeds,
            Baths: numBaths,
          } = row;
          const unit = _unit?.toString();
          const postalCode = _postalCode?.toString();

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

          //Try to find this property, if it doesn't exist then set createNewProperty to true
          let properties = [];
          if (!missingFields.length) {
            const { data } = await axios.post('/api/get-properties-by-address', {
              organization: user?.organization,
              property: {
                address,
                unit,
                city,
                state,
                postalCode,
                country: 'US',
                numBeds,
                numBaths,
              },
            });

            properties = JSON.parse(data.response).properties;
          }

          let tenant: ImportTenant;
          if (properties.length > 0) {
            const duplicateProperty = properties[0];
            tenant = ImportTenantSchema.parse({
              key: index,
              tenantEmail,
              tenantName,
              property: {
                address: duplicateProperty.address,
                unit: duplicateProperty.unit,
                propertyUUId: deconstructKey(duplicateProperty.pk),
                city: duplicateProperty.city,
                state: duplicateProperty.state,
                postalCode: duplicateProperty.postalCode,
                numBeds: duplicateProperty.numBeds,
                numBaths: duplicateProperty.numBaths,
                country: duplicateProperty.country,
              },
              pmEmail: user.email,
              pmName: altName ?? user.name,
              createNewProperty: false,
              organization: user.organization,
              organizationName: user.organizationName,
              error: undefined,
              warning: 'Property already exists, this tenant will be added to the existing property at this address',
            });
          } else {
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

            tenant = ImportTenantSchema.parse({
              key: index,
              tenantEmail,
              tenantName,
              property,
              pmEmail: user.email,
              pmName: altName ?? user.name,
              createNewProperty: true,
              organization: user.organization,
              organizationName: user.organizationName,
              error: missingFields.length > 0 ? `Missing required field(s): {${missingFields}}` : undefined,
            });
          }

          setUploadList((prev) => [...prev, tenant]);
          index++;
        }
      } catch (err: any) {
        setFileUploadError(err?.message || 'Error uploading file');
      }
      setPreImportTenantsLoading(false);
    },
    [setUploadList, user, altName, userType]
  );

  const handleImportTenants = async () => {
    if (!user || userType !== USER_TYPE.PROPERTY_MANAGER || !user.roles?.includes(ENTITIES.PROPERTY_MANAGER)) {
      alert(USER_PERMISSION_ERROR);
      return;
    }
    setImportTenantsLoading(true);
    setImportTenantProgress(0);

    let errorList: ImportTenant[] = [];

    for (let index = 0; index < uploadList.length; index++) {
      const tenant = uploadList[index];
      const params: CreateTenant = {
        ...tenant,
      };

      await axios
        .post('/api/create-tenant', params)
        .then((res) => {
          setImportTenantProgress((prev) => prev + 1);
        })
        .catch((err) => {
          console.log(err);
          setImportTenantProgress((prev) => prev + 1);
          errorList.push({
            ...tenant,
            error: err?.response?.data?.userErrorMessage ?? 'Error uploading tenant',
          });
        });
    }

    if (!errorList.length) {
      closeModal();
      renderToastSuccess(`${uploadList.length} tenants successfully created!`, modalId);
    } else {
      renderToastError(undefined, `Error uploading ${errorList.length} tenants. Please try again`, modalId);
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
      });

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
    <Modal id={modalId} onClose={closeModal} openButtonText="Import Tenants" title="Import Tenants" bodyClasses="w-11/12 max-w-3xl">
      <div className="clear-right mt-6 w-full">
        <div className="mb-4 flex flex-col justify-center items-center mx-auto">
          <p className="text-center mb-2 ">To add tenants in bulk, upload a .csv or .xls/.xlsx file</p>
          <div className="flex flex-row items-center">
            <input className="text-center mx-auto w-72 py-4 pr-4" type="file" name="fileUpload" id="fileUpload" accept=".xls, .xlsx, .csv" onChange={handleFileUpload} />
            <button
              onClick={() => {
                setUploadList([]);
                //Reset file input
                //@ts-ignore
                document.getElementById('fileUpload').value = '';
                setFileUploadError(null);
              }}
              className="btn btn-square btn-sm bg-error flex items-center justify-center  text-white"
            >
              X
            </button>
          </div>
        </div>

        <div className="flex flex-row justify-center text-sm text-accent">
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

              {uploadList.map((value: ImportTenant, index: number) => {
                return renderPreUploadTenantCard(value, index);
              })}
            </>
          )}
        </div>

        {importTenantsLoading && uploadList.length > 1 && (
          <div className=" w-full h-6 text-center rounded mt-4">
            <div className="absolute h-6 bg-accent rounded" style={{ width: formatProgressToPercent(importTenantProgress).toString() + '%' }}></div>
            <div className="relative h-full w-full">{formatProgressToPercent(importTenantProgress)} %</div>
          </div>
        )}

        {fileUploadError && (
          <div className="w-full text-error flex flex-row items-center justify-center">
            <BiError fontSize={30} className="mr-2" />
            {fileUploadError}
          </div>
        )}

        <button
          className="btn btn-primary mt-4 w-full"
          type="submit"
          disabled={uploadList.length === 0 || formattingError || importTenantsLoading}
          onClick={() => {
            handleImportTenants();
          }}
        >
          {importTenantsLoading || preImportTenantsLoading ? (
            <LoadingSpinner containerClass="px-2" />
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
