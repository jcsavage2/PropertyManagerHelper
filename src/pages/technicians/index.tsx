import { PortalLeftPanel } from '@/components/portal-left-panel';
import { useCallback, useEffect, useState } from 'react';
import { CreateTechnicianModal } from '@/components/modals/create-technician';
import axios from 'axios';
import { useDevice } from '@/hooks/use-window-size';
import { BottomNavigationPanel } from '@/components/navigation/bottom-navigation-panel';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';
import { LoadingSpinner } from '@/components/loading-spinner';
import { CiCircleRemove } from 'react-icons/ci';
import { createdToFormattedDateTime, getPageLayout, renderToastError, renderToastSuccess, toTitleCase } from '@/utils';
import { IUser, USER_TYPE } from '@/database/entities/user';
import ConfirmationModal from '@/components/modals/confirmation';
import { StartKey } from '@/database/entities';
import { DEFAULT_DELETE_USER, USER_PERMISSION_ERROR } from '@/constants';
import { DeleteUser, DeleteUserBody } from '@/types';
import { SearchBar } from '@/components/search-bar';
import MobileCard from '@/components/mobile-card';

const Technicians = () => {
  const { user } = useSessionUser();
  const { userType, altName } = useUserContext();
  const { isMobile } = useDevice();

  const [confirmDeleteModalIsOpen, setConfirmDeleteModalIsOpen] = useState(false);
  const [toDelete, setToDelete] = useState<DeleteUser>(DEFAULT_DELETE_USER);
  const [techs, setTechs] = useState<IUser[]>([]);
  const [techsLoading, setTechsLoading] = useState(true);
  const [techSearchString, setTechSearchString] = useState<string>('');
  const [startKey, setStartKey] = useState<StartKey | undefined>(undefined);

  const fetchTechs = useCallback(
    async (isInitial: boolean, _searchString?: string) => {
      if (!user || !userType) return;
      setTechsLoading(true);
      try {
        if (userType !== USER_TYPE.PROPERTY_MANAGER || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
          throw new Error(USER_PERMISSION_ERROR);
        }
        //Reset filter options on initial fetch
        if (isInitial && !_searchString) {
          setTechSearchString('');
        }

        const { data } = await axios.post('/api/get-techs-for-org', {
          organization: user.organization,
          startKey: isInitial ? undefined : startKey,
          techSearchString: _searchString,
        });
        const response = JSON.parse(data.response);
        const _techs: IUser[] = response.techs;
        setStartKey(response.startKey);
        isInitial ? setTechs(_techs) : setTechs([...techs, ..._techs]);
      } catch (err) {
        console.log({ err });
      }
      setTechsLoading(false);
    },
    [user, userType, startKey, techs]
  );

  useEffect(() => {
    fetchTechs(true);
  }, [user, userType]);

  const handleDeleteTech = useCallback(
    async ({ pk, sk }: DeleteUser) => {
      setTechsLoading(true);
      try {
        if (!user || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER) || userType !== USER_TYPE.PROPERTY_MANAGER) {
          throw new Error(USER_PERMISSION_ERROR);
        }
        const { data } = await axios.post('/api/delete/user', {
          pk,
          sk,
          roleToDelete: USER_TYPE.TECHNICIAN,
          madeByEmail: user.email,
          madeByName: altName ?? user.name,
        } as DeleteUserBody);
        if (data.response) {
          renderToastSuccess('Technician Deleted!');
          setTechs(techs.filter((t) => t.pk !== pk));
        }
      } catch (err: any) {
        console.error(err);
        renderToastError(err, 'Error Deleting Technician');
      }
      setConfirmDeleteModalIsOpen(false);
      setTechsLoading(false);
    },
    [user, userType, techs, altName]
  );

  if (user && !user.organization && userType !== USER_TYPE.PROPERTY_MANAGER) {
    return <p>You are not authorized to use this page. You must be a property manager in an organization.</p>;
  }

  return (
    <>
      <div id="technicians" className="mx-4 mt-4" style={getPageLayout(isMobile)}>
        {!isMobile && <PortalLeftPanel />}
        <ConfirmationModal
          id={'delete-technician'}
          confirmationModalIsOpen={confirmDeleteModalIsOpen}
          setConfirmationModalIsOpen={setConfirmDeleteModalIsOpen}
          onConfirm={() => handleDeleteTech(toDelete)}
          childrenComponents={<div className="text-center">Are you sure you want to delete the technician record for {toTitleCase(toDelete.name)}?</div>}
          onCancel={() => setToDelete(DEFAULT_DELETE_USER)}
        />
        <div className="">
          <div className={isMobile ? `w-full flex flex-col justify-center` : `flex flex-row justify-between`}>
            <h1 className="text-4xl">Technicians</h1>
            <div className={`justify-self-end ${isMobile && 'mt-2 w-full'}`}>
              <CreateTechnicianModal onSuccessfulAdd={() => fetchTechs(true)} />
            </div>
          </div>
          <SearchBar
            searchString={techSearchString}
            setSearchString={setTechSearchString}
            resultsLoading={techsLoading}
            onSearch={() => fetchTechs(true, techSearchString)}
            onClear={() => {
              setTechSearchString('');
              fetchTechs(true);
            }}
            placeholder={'Search Technicians...'}
          />
          {isMobile ? (
            <div className={`mt-4 pb-4 min-h-screen`}>
              <div className="flex flex-col items-center">
                {techs.length ? (
                  <p className="text-sm place-self-start font-light italic mb-1 ml-2">
                    {'Showing ' + techs.length} {techs.length === 1 ? ' technician...' : 'technicians...'}
                  </p>
                ) : null}
                {techs.map((tech: IUser, index) => {
                  return (
                    <MobileCard title={toTitleCase(tech.name)} key={`${tech.pk}-${tech.sk}-${index}`}>
                      <div className="flex flex-row justify-between items-center">
                        <p className="text-sm">{`${tech.email}`} </p>
                        <CiCircleRemove
                          className="text-3xl text-error cursor-pointer -mt-8"
                          onClick={() => {
                            if (techsLoading) return;
                            setToDelete({
                              pk: tech.pk,
                              sk: tech.sk,
                              name: tech.name,
                            });
                            setConfirmDeleteModalIsOpen(true);
                          }}
                        />
                      </div>
                    </MobileCard>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`${techsLoading && 'opacity-50 pointer-events-none'} mb-2 mt-1`}>
              <div className="overflow-x-auto">
                {techs && techs.length > 0 && (
                  <table className="table table-zebra">
                    <thead className="">
                      <tr className="">
                        <th className="">Name</th>
                        <th className="">Email</th>
                        <th className="">Created</th>
                        <th className=""></th>
                      </tr>
                    </thead>
                    <tbody className="">
                      {techs.map((tech: IUser) => {
                        return (
                          <tr key={`${tech.pk}-${tech.sk}`} className="h-16">
                            <td className="">{`${toTitleCase(tech.name)}`}</td>
                            <td className="">{`${tech.email}`}</td>
                            <td className="">{createdToFormattedDateTime(tech.created)[0]}</td>
                            <td className="">
                              <CiCircleRemove
                                className="text-3xl text-error cursor-pointer"
                                onClick={() => {
                                  if (techsLoading) return;
                                  setToDelete({
                                    pk: tech.pk,
                                    sk: tech.sk,
                                    name: tech.name,
                                  });
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
              <LoadingSpinner containerClass="h-20" spinnerClass="spinner-large" />
            </div>
          )}
          {techs.length && startKey && !techsLoading ? (
            <div className="w-full flex items-center justify-center mb-24">
              <button onClick={() => fetchTechs(false, techSearchString.length !== 0 ? techSearchString : undefined)} className="btn btn-secondary mx-auto mb-24">
                Load more
              </button>
            </div>
          ) : (
            <div className="mb-8"></div>
          )}
        </div>
      </div>
      {isMobile && <BottomNavigationPanel />}
    </>
  );
};

export default Technicians;
