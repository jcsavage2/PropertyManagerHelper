import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useDevice } from '@/hooks/use-window-size';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useUserContext } from '@/context/user';
import { LoadingSpinner } from '@/components/loading-spinner';
import { createdToFormattedDateTime, toTitleCase } from '@/utils';
import { IUser, USER_TYPE } from '@/database/entities/user';
import { StartKey } from '@/database/entities';
import { CreatePropertyManagerModal } from '@/components/modals/create-property-manager';
import { USER_PERMISSION_ERROR } from '@/constants';
import AdminPortal from '@/components/layouts/admin-portal';
import MobileCard from '@/components/mobile-card';
import LoadMore from '@/components/load-more';

const PropertyManagers = () => {
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
    <AdminPortal id="property-managers" isLoading={!user || !userType}>
      <div className={isMobile ? `w-full flex flex-col justify-center` : `flex flex-row justify-between`}>
        <h1 className="text-4xl">Property Managers</h1>
        <div className={`justify-self-end ${isMobile && 'mt-3 w-full'}`}>{user?.isAdmin ? <CreatePropertyManagerModal onSuccessfulAdd={() => fetchPMs(true)} /> : null}</div>
      </div>
      {isMobile ? (
        <div className={`${pmsLoading && 'opacity-50 pointer-events-none'} mt-4 pb-4`}>
          <div className="flex flex-col items-center">
            {pms.length ? (
              <p className="text-sm place-self-start font-light italic mb-1 ml-2">
                {'Showing ' + pms.length} {pms.length === 1 ? ' property manager...' : ' property managers...'}
              </p>
            ) : null}
            {pms.map((pm: IUser, index) => {
              return (
                <MobileCard title={toTitleCase(pm.name)} key={`${pm.pk}-${pm.sk}-${index}`}>
                  <p className="text-sm mt-2">{`${pm.email}`} </p>
                  <div className="text-sm mt-2 flex flex-row items-center">
                    Is Admin? <p className="ml-2">{pm.isAdmin ? 'Yes' : 'No'}</p>{' '}
                  </div>
                  <p className="text-sm mt-2">{`${pm.status}`} </p>
                </MobileCard>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={`${pmsLoading && 'opacity-50 pointer-events-none'} mb-2 mt-2`}>
          <div className="overflow-x-auto">
            {pms && pms.length > 0 && (
              <table className="table table">
                <thead className="">
                  <tr className="">
                    <th className="">Name</th>
                    <th className="">Email</th>
                    <th className="">Status</th>
                    <th className="">Is Admin?</th>
                    <th className="md:hidden">Created</th>
                  </tr>
                </thead>
                <tbody className="">
                  {pms.map((pm: IUser) => {
                    return (
                      <tr key={`${pm.pk}-${pm.sk}`} className="h-16">
                        <td className="">{`${toTitleCase(pm.name)}`}</td>
                        <td className="">{`${pm.email}`}</td>
                        <td className="">{`${pm.status}`}</td>
                        <td className="">{`${pm.isAdmin ? 'Yes' : 'No'}`}</td>
                        <td className="md:hidden">{createdToFormattedDateTime(pm.created)[0]}</td>
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
      {pmsLoading ? (
        <div className="mt-4">
          <LoadingSpinner spinnerClass="spinner-large" />
        </div>
      ) : (
        <div className="w-full flex items-center justify-center">
          <LoadMore isDisabled={pmsLoading} isVisible={pms && pms.length && startKey} onClick={() => fetchPMs(false)} />
        </div>
      )}
    </AdminPortal>
  );
};

export default PropertyManagers;
