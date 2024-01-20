import { useUserContext } from '@/context/user';
import { ENTITIES } from '@/database/entities';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useDocument } from '@/hooks/use-document';
import { toTitleCase } from '@/utils';
import Image from 'next/image';
import Link from 'next/link';
import { Option } from '@/types';
import { useRouter } from 'next/router';
import React, { ReactNode, useEffect, useState } from 'react';
import { USER_TYPE } from '@/database/entities/user';
import Select, { SingleValue } from 'react-select';
import { useDevice } from '@/hooks/use-window-size';
import { BottomNavigationPanel } from '../navigation/bottom-navigation-panel';
import DrawerSkeleton from '../skeletons/drawer';

type AdminPortalProps = {
  id: string;
  isLoading?: boolean;
  showBottomNav?: boolean;
  children: ReactNode;
};

const selectedListItem = 'text-primary-content bg-base-300';

const AdminPortal = ({ id, children, isLoading = false, showBottomNav = true }: AdminPortalProps) => {
  const router = useRouter();
  const { userType, altName, setAltName } = useUserContext();
  const { user } = useSessionUser();
  const [altNameOptions, setAltNameOptions] = useState<Option[]>([]);
  const { clientDocument } = useDocument();
  const { isMobile } = useDevice();

  useEffect(() => {
    if (!user || userType !== USER_TYPE.PROPERTY_MANAGER || !user.altNames || !user.name) return;
    let options: Option[] = user.altNames.map((name) => ({ label: name, value: name }));
    options.push({ label: toTitleCase(user.name), value: toTitleCase(user.name) });
    setAltNameOptions(options);
  }, [user, userType]);

  if (isMobile) {
    return (
      <div id={id} className="p-4">
        {children}
        {showBottomNav && <BottomNavigationPanel />}
      </div>
    );
  }

  return (
    <div id={id} className="drawer drawer-open">
      <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content pl-6 pt-6">{children}</div>
      {userType === USER_TYPE.TENANT ? null : (
        <div className="drawer-side bg-base-100 border-r border-base-300 min-h-full !w-56 px-3">
          {isLoading ? (
            <DrawerSkeleton />
          ) : (
            <>
              <label htmlFor="my-drawer-2" aria-label="close sidebar" className="drawer-overlay"></label>
              <Image className="mx-auto" src="/2.png" alt="PILLAR" width={100} height={0} priority={true} />
              <hr className="h-0.5 bg-base-300" />
              {userType === ENTITIES.PROPERTY_MANAGER && (
                <div className="text-sm">
                  <p className="mt-2 text-center break-words">{'Hey, ' + (altName ? toTitleCase(altName) : toTitleCase(user?.name))}</p>
                  {setAltNameOptions?.length ? (
                    <Select
                      options={altNameOptions}
                      className="mb-4 mt-2"
                      placeholder={'Change acting name'}
                      onChange={(newValue: SingleValue<Option>) => {
                        if (!newValue || !user?.name) return;
                        if (newValue.value === toTitleCase(user?.name)) {
                          setAltName(null);
                          return;
                        }
                        setAltName(newValue.value);
                      }}
                      menuPortalTarget={clientDocument?.body}
                    />
                  ) : null}

                  <hr className="h-0.5 bg-base-300" />
                </div>
              )}
              <ul className="menu text-base-content child:mb-4 child-hover:bg-secondary child-hover:text-secondary-content child:rounded-md">
                {/* Sidebar content here */}

                <li className={` ${router.pathname.includes('/work-orders') && selectedListItem}`}>
                  <Link href={'/work-orders'}>Work Orders</Link>
                </li>

                {userType === ENTITIES.PROPERTY_MANAGER && (
                  <>
                    <li className={` ${router.pathname.includes('/property-managers') && selectedListItem}`}>
                      <Link href={'/property-managers'}>Property Managers</Link>
                    </li>
                    <li className={` ${router.pathname.includes('/tenants') && selectedListItem}`}>
                      <Link href={'/tenants'}>Tenants</Link>
                    </li>
                    <li className={` ${router.pathname.includes('/technicians') && selectedListItem}`}>
                      <Link href={'/technicians'}>Technicians</Link>
                    </li>
                    <li className={` ${router.pathname.includes('/properties') && selectedListItem}`}>
                      <Link href={'/properties'}>Properties</Link>
                    </li>
                  </>
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
