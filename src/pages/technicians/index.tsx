import { PortalLeftPanel } from '@/components/portal-left-panel';
import { useCallback, useEffect, useState } from 'react';
import { AddTechnicianModal } from '@/components/add-technician-modal';
import axios from 'axios';
import { useDevice } from '@/hooks/use-window-size';
import { BottomNavigationPanel } from '@/components/bottom-navigation-panel';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';
import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';
import { CiCircleRemove } from 'react-icons/ci';
import { createdToFormattedDateTime, getPageLayout, toTitleCase } from '@/utils';
import { IUser, userRoles } from '@/database/entities/user';
import { MdClear } from 'react-icons/md';
import ConfirmationModal from '@/components/confirmation-modal';
import { toast } from 'react-toastify';
import { ENTITIES, StartKey } from '@/database/entities';
import { DeleteRequest } from '../api/delete';
import { GetTechsForOrgRequest } from '../api/get-techs-for-org';

const Technicians = () => {
  const { user } = useSessionUser();
  const { userType, altName } = useUserContext();
  const { isMobile } = useDevice();

  const [addTechModalIsOpen, setAddTechModalIsOpen] = useState(false);
  const [confirmDeleteModalIsOpen, setConfirmDeleteModalIsOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ pk: string; sk: string; name: string; roles: string[] }>({ pk: '', sk: '', name: '', roles: [] });
  const [techs, setTechs] = useState<IUser[]>([]);
  const [techsLoading, setTechsLoading] = useState(true);
  const [techSearchString, setTechSearchString] = useState<string>('');
  const [startKey, setStartKey] = useState<StartKey | undefined>(undefined);

  const fetchTechs = useCallback(
    async (isInitial: boolean, _searchString?: string) => {
      if (!user || !userType) return;
      setTechsLoading(true);
      try {
        if (!user.email || userType !== 'PROPERTY_MANAGER' || !user.roles?.includes(userRoles.PROPERTY_MANAGER) || !user.organization) {
          throw new Error('user must be a property manager in an organization');
        }
        //Reset filter options on initial fetch
        if (isInitial && !_searchString) {
          setTechSearchString('');
        }
        const body: GetTechsForOrgRequest = {
          organization: user.organization,
          startKey: isInitial ? undefined : startKey,
          techSearchString: _searchString,
        };
        const { data } = await axios.post('/api/get-techs-for-org', body);
        const response = JSON.parse(data.response);
        const _techs: IUser[] = response.techs;
        setStartKey(response.startKey);
        isInitial ? setTechs(_techs) : setTechs([...techs, ..._techs]);
      } catch (err) {
        console.log({ err });
      }
      setTechsLoading(false);
    },
    [user, userType, techSearchString, startKey]
  );

  useEffect(() => {
    fetchTechs(true);
  }, [user, userType]);

  
  const handleDeleteTech = useCallback(
    async ({ pk, sk, name, roles }: { pk: string; sk: string; name: string; roles: string[]; }) => {
      setTechsLoading(true);
      try {
        if (!pk || !sk || !name || !roles) {
          throw new Error('To delete a tech, a pk sk name, and roles must be present');
        }
        if (!user || !user.roles?.includes(userRoles.PROPERTY_MANAGER) || !user.email || !user.name) {
          throw new Error('User must be a pm to delete techs');
        }
        const params: DeleteRequest = {
          pk: pk,
          sk: sk,
          entity: ENTITIES.USER,
          roleToDelete: ENTITIES.TECHNICIAN,
          currentUserRoles: roles,
          madeByEmail: user.email,
          madeByName: altName ?? user.name,
        };
        const { data } = await axios.post('/api/delete', params);
        if (data.response) {
          toast.success('Technician Deleted!', {
            position: toast.POSITION.TOP_CENTER,
            draggable: false,
          });
          setTechs(techs.filter((t) => t.pk !== pk));
        }

        //TODO: delete technician should unassign them from all wo roles
        //Update this when you add fetching from technician entity to get all assigned WOs
      } catch (err) {
        console.error(err);
        toast.error('Error Deleting Technician. Please Try Again', {
          position: toast.POSITION.TOP_CENTER,
          draggable: false,
        });
      }
      setConfirmDeleteModalIsOpen(false);
      setTechsLoading(false);
    },
    [user, userType, techs]
  );

  if (user && !user.organization && userType !== 'PROPERTY_MANAGER') {
    return <p>You are not authorized to use this page. You must be a property manager in an organization.</p>;
  }

  return (
    <div id="testing" className="mx-4 mt-4" style={getPageLayout(isMobile)}>
      {!isMobile && <PortalLeftPanel />}
      <ConfirmationModal
        confirmationModalIsOpen={confirmDeleteModalIsOpen}
        setConfirmationModalIsOpen={setConfirmDeleteModalIsOpen}
        onConfirm={() => handleDeleteTech(toDelete)}
        childrenComponents={<div className="text-center">Are you sure you want to delete the technician record for {toDelete.name}?</div>}
        onCancel={() => setToDelete({ pk: '', sk: '', name: '', roles: [] })}
      />
      <div className="lg:max-w-5xl">
        <div className={isMobile ? `w-full flex flex-col justify-center` : `flex flex-row justify-between`}>
          <h1 className="text-4xl">Technicians</h1>
          <div className={`justify-self-end ${isMobile && 'mt-2 w-full'}`}>
            <button
              className="bg-blue-200 mr-4 md:mt-0 p-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-5/12 md:w-36 text-center "
              onClick={() => {
                !techsLoading && setAddTechModalIsOpen(true);
              }}
              disabled={techsLoading}
            >
              + Technician
            </button>
          </div>
        </div>
        <div className={`flex flex-row items-center justify-start h-10 text-gray-600 mt-4 ${techsLoading && 'opacity-50 pointer-events-none'}`}>
          <input
            type="text"
            placeholder="Search technicians..."
            className="text-black pl-3 h-full rounded pr-9 w-80 border border-blue-200"
            value={techSearchString}
            onChange={(e) => {
              setTechSearchString(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && techSearchString.length !== 0 && !techsLoading) {
                fetchTechs(true, techSearchString);
              }
            }}
          />
          <MdClear
            fontSize={28}
            className={` cursor-pointer text-red-500 hover:text-red-600 relative -left-8 ${!techSearchString && 'opacity-0 pointer-events-none'}}`}
            onClick={() => {
              if (techsLoading || !techSearchString) return;
              setTechSearchString('');
              fetchTechs(true);
            }}
          />
          <div
            className="relative -left-3 cursor-pointer rounded px-3 py-1 hover:bg-blue-300 bg-blue-200"
            onClick={() => {
              if (techsLoading || techSearchString.length === 0) return;
              fetchTechs(true, techSearchString);
            }}
          >
            Search
          </div>
        </div>
        {isMobile ? (
          <div className={`mt-4 pb-4`}>
            <div className="flex flex-col items-center">
              {techs.length ? (
                <p className="text-sm place-self-start font-light italic mb-1 ml-2 text-gray-500">
                  {'Showing ' + techs.length} {techs.length === 1 ? ' technician...' : 'technicians...'}
                </p>
              ) : null}
              {techs.map((tech: IUser, index) => {
                return (
                  <div
                    key={`${tech.pk}-${tech.sk}-${index}`}
                    className={`flex flex-row justify-between items-center w-full rounded-lg py-4 px-2 h-36 bg-gray-100 shadow-[0px_1px_5px_0px_rgba(0,0,0,0.3)] ${
                      index === 0 && 'mt-1'
                    } ${index < techs.length - 1 && 'mb-3'}`}
                  >
                    <div className="pl-2 text-gray-800">
                      <p className="text-2xl ">{toTitleCase(tech.name)} </p>
                      <p className="text-sm mt-2">{`${tech.email}`} </p>
                    </div>
                    <CiCircleRemove
                      className="text-3xl text-red-500 cursor-pointer"
                      onClick={() => {
                        if (techsLoading) return;
                        setToDelete({ pk: tech.pk, sk: tech.sk, name: tech.name, roles: tech.roles });
                        setConfirmDeleteModalIsOpen(true);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`${techsLoading && 'opacity-50 pointer-events-none'} mb-2 mt-2`}>
            <div className="overflow-x-auto">
              {techs && techs.length > 0 && (
                <table className="w-full border-spacing-x-10 table-auto">
                  <thead className="">
                    <tr className="text-left text-gray-400">
                      <th className="font-normal w-72">Name</th>
                      <th className="font-normal w-72">Email</th>
                      <th className="font-normal w-36">Created</th>
                      <th className="w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {techs.map((tech: IUser) => {
                      return (
                        <tr key={`${tech.pk}-${tech.sk}`} className="h-20">
                          <td className="border-b border-t px-4 py-1">{`${toTitleCase(tech.name)}`}</td>
                          <td className="border-b border-t px-4 py-1">{`${tech.email}`}</td>
                          <td className="border-b border-t px-4 py-1">{createdToFormattedDateTime(tech.created)[0]}</td>
                          <td className="pl-6 py-1">
                            <CiCircleRemove
                              className="text-3xl text-red-500 cursor-pointer"
                              onClick={() => {
                                if (techsLoading) return;
                                setToDelete({ pk: tech.pk, sk: tech.sk, name: tech.name, roles: tech.roles });
                                setConfirmDeleteModalIsOpen(true);
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
        {!techsLoading && techs.length === 0 && <div className="font-bold text-center md:mt-6">Sorry, no technicians found.</div>}
        {techsLoading && (
          <div className="mt-8">
            <LoadingSpinner containerClass='h-20' spinnerClass="spinner-large" />
          </div>
        )}
        {techs.length && startKey && !techsLoading ? (
          <div className="w-full flex items-center justify-center mb-8">
            <button
              onClick={() => fetchTechs(false, techSearchString.length !== 0 ? techSearchString : undefined)}
              className="bg-blue-200 mx-auto py-3 px-4 w-44 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mb-24"
            >
              Load more
            </button>
          </div>
        ) : <div className="mb-8"></div>}
      </div>
      <AddTechnicianModal
        technicianModalIsOpen={addTechModalIsOpen}
        setTechnicianModalIsOpen={setAddTechModalIsOpen}
        onSuccessfulAdd={() => fetchTechs(true)}
      />
      {isMobile && <BottomNavigationPanel />}
    </div>
  );
};

export default Technicians;
