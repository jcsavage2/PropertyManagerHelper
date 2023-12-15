import { PortalLeftPanel } from '@/components/portal-left-panel';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useDevice } from '@/hooks/use-window-size';
import { BottomNavigationPanel } from '@/components/bottom-navigation-panel';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';
import { LoadingSpinner } from '@/components/loading-spinner/loading-spinner';
import { createdToFormattedDateTime, getPageLayout, toTitleCase } from '@/utils';
import { IUser, USER_TYPE } from '@/database/entities/user';
import { ENTITIES, StartKey } from '@/database/entities';
import { AddPropertyManagerModal } from '@/components/add-property-manager-modal';
import { USER_PERMISSION_ERROR } from '@/constants';
import { GetPM } from '@/types';
import { GetPMSchema } from '@/types/customschemas';

const Technicians = () => {
  const { user } = useSessionUser();
  const { userType } = useUserContext();
  const { isMobile } = useDevice();

  const [addPMModalIsOpen, setAddPMModalIsOpen] = useState(false);
  const [pms, setPMs] = useState<IUser[]>([]);
  const [pmsLoading, setPMsLoading] = useState(true);
  const [startKey, setStartKey] = useState<StartKey | undefined>(undefined);

  const fetchPMs = useCallback(
    async (isInitial: boolean) => {
      if (!user || !userType) return;
      setPMsLoading(true);
      try {
        if (!user || userType !== USER_TYPE.PROPERTY_MANAGER || !user.roles?.includes(USER_TYPE.PROPERTY_MANAGER)) {
          throw new Error(USER_PERMISSION_ERROR);
        }
        const { data } = await axios.post('/api/get-all-pms-for-org', {
          organization: user.organization,
          startKey: isInitial ? undefined : startKey,
        });
        const response = JSON.parse(data.response);
        const _pms: IUser[] = response.pms;
        setStartKey(response.startKey);
        isInitial ? setPMs(_pms) : setPMs((prev) => [...prev, ..._pms]);
      } catch (err) {
        console.log({ err });
      }
      setPMsLoading(false);
    },
    [user, userType, startKey]
  );

  useEffect(() => {
    fetchPMs(true);
  }, [user, userType]);

  if (user && !user.organization && userType !== USER_TYPE.PROPERTY_MANAGER) {
    return <p>You are not authorized to use this page. You must be a property manager in an organization.</p>;
  }

  return (
    <div id="property-managers" className="mx-4 mt-4" style={getPageLayout(isMobile)}>
      {!isMobile && <PortalLeftPanel />}
      <div className="lg:max-w-5xl mb-44 md:mb-10">
        <div className={isMobile ? `w-full flex flex-col justify-center` : `flex flex-row justify-between`}>
          <h1 className="text-4xl">Property Managers</h1>
          <div className={`justify-self-end ${isMobile && 'mt-2 w-full'}`}>
            {user?.isAdmin ? (
              <button
                className="bg-blue-200 mr-4 md:mt-0 p-2 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 w-7/12 md:w-44 text-center "
                onClick={() => {
                  !pmsLoading && setAddPMModalIsOpen(true);
                }}
                disabled={pmsLoading}
              >
                + Property Manager
              </button>
            ) : null}
          </div>
        </div>
        {isMobile ? (
          <div className={`mt-4 pb-4`}>
            <div className="flex flex-col items-center">
              {pms.length ? (
                <p className="text-sm place-self-start font-light italic mb-1 ml-2 text-gray-500">
                  {'Showing ' + pms.length} {pms.length === 1 ? ' property manager...' : ' property managers...'}
                </p>
              ) : null}
              {pms.map((pm: IUser, index) => {
                return (
                  <div
                    key={`${pm.pk}-${pm.sk}-${index}`}
                    className={`flex flex-row justify-between items-center w-full rounded-lg py-4 px-2 h-36 bg-gray-100 shadow-[0px_1px_5px_0px_rgba(0,0,0,0.3)] ${
                      index === 0 && 'mt-1'
                    } ${index < pms.length - 1 && 'mb-3'}`}
                  >
                    <div className="pl-2 text-gray-800">
                      <p className="text-2xl ">{toTitleCase(pm.name)} </p>
                      <p className="text-sm mt-2">{`${pm.email}`} </p>
                      <div className="text-sm mt-2 flex flex-row items-center">
                        Is Admin? <p className="ml-2">{pm.isAdmin ? 'Yes' : 'No'}</p>{' '}
                      </div>
                      <p className="text-sm mt-2">{`${pm.status}`} </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`${pmsLoading && 'opacity-50 pointer-events-none'} mb-2 mt-8`}>
            <div className="overflow-x-auto">
              {pms && pms.length > 0 && (
                <table className="w-full border-spacing-x-10 table-auto">
                  <thead className="">
                    <tr className="text-left text-gray-400">
                      <th className="font-normal w-72">Name</th>
                      <th className="font-normal w-72">Email</th>
                      <th className="font-normal w-24">Status</th>
                      <th className="font-normal w-24">Is Admin?</th>
                      <th className="font-normal w-36">Created</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {pms.map((pm: IUser) => {
                      return (
                        <tr key={`${pm.pk}-${pm.sk}`} className="h-20">
                          <td className="border-b border-t px-4 py-1">{`${toTitleCase(pm.name)}`}</td>
                          <td className="border-b border-t px-4 py-1">{`${pm.email}`}</td>
                          <td className="border-b border-t px-4 py-1">{`${pm.status}`}</td>
                          <td className="border-b border-t px-4 py-1">{`${pm.isAdmin ? 'Yes' : 'No'}`}</td>
                          <td className="border-b border-t px-4 py-1">{createdToFormattedDateTime(pm.created)[0]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
        {!pmsLoading && pms.length === 0 && <div className="font-bold text-center md:mt-6">Sorry, no property managers found.</div>}
        {pmsLoading && (
          <div className="md:mt-8">
            <LoadingSpinner spinnerClass="spinner-large" />
          </div>
        )}
        {pms.length && startKey && !pmsLoading ? (
          <div className="w-full flex items-center justify-center">
            <button onClick={() => fetchPMs(false)} className="bg-blue-200 mx-auto py-3 px-4 w-44 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mb-24">
              Load more
            </button>
          </div>
        ) : null}
      </div>
      <AddPropertyManagerModal addPMModalIsOpen={addPMModalIsOpen} setAddPMModalIsOpen={setAddPMModalIsOpen} onSuccessfulAdd={() => fetchPMs(true)} />
      {isMobile && <BottomNavigationPanel />}
    </div>
  );
};

export default Technicians;
