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
import { RiFilePaper2Fill } from 'react-icons/ri';
import { BsFillPersonFill, BsPersonLinesFill } from 'react-icons/bs';
import { MdEngineering } from 'react-icons/md';
import { CiLocationOn } from 'react-icons/ci';

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
    <div id={id} className="drawer drawer-open pb-6">
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
              <ul className="menu text-base-content child:py-2 child:px-2 child:flex child:flex-row child:items-center child child:mb-4 child-hover:bg-secondary child-hover:text-secondary-content child:rounded-md">
                <Link href={'/work-orders'} className={`${router.pathname.includes('/work-orders') && selectedListItem}`}>
                  <RiFilePaper2Fill className="mr-2" />
                  <p>Work Orders</p>
                </Link>

                {userType === ENTITIES.PROPERTY_MANAGER && (
                  <>
                    <Link href={'/property-managers'} className={`${router.pathname.includes('/property-managers') && selectedListItem}`}>
                      <BsPersonLinesFill className={`mr-2`} />
                      <p>Property Managers</p>
                    </Link>
                    <Link href={'/tenants'} className={`${router.pathname.includes('/tenants') && selectedListItem}`}>
                      <BsFillPersonFill className={`mr-2`} />
                      <p>Tenants</p>
                    </Link>
                    <Link href={'/technicians'} className={`${router.pathname.includes('/technicians') && selectedListItem}`}>
                      <MdEngineering className={`mr-2`} />
                      <p>Technicians</p>
                    </Link>
                    <Link href={'/properties'} className={`${router.pathname.includes('/properties') && selectedListItem}`}>
                      <CiLocationOn className="mr-2" />
                      <p>Properties</p>
                    </Link>
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
