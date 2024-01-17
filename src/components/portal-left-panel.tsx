import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BsFillPersonFill, BsPersonLinesFill } from 'react-icons/bs';
import { CiLocationOn } from 'react-icons/ci';
import { RiFilePaper2Fill } from 'react-icons/ri';
import { MdEngineering } from 'react-icons/md';
import { useUserContext } from '@/context/user';
import { ENTITIES } from '@/database/entities';
import Select, { SingleValue } from 'react-select';
import { useSessionUser } from '@/hooks/auth/use-session-user';
import { useEffect, useState } from 'react';
import { USER_TYPE } from '@/database/entities/user';
import { Option } from '@/types';
import { toTitleCase } from '@/utils';

export const PortalLeftPanel = () => {
  const router = useRouter();
  const { userType, altName, setAltName } = useUserContext();
  const { user } = useSessionUser();
  const [altNameOptions, setAltNameOptions] = useState<Option[]>([]);

  useEffect(() => {
    if (!user || userType !== USER_TYPE.PROPERTY_MANAGER || !user.altNames || !user.name) return;
    let options: Option[] = user.altNames.map((name) => ({ label: name, value: name }));
    options.push({ label: toTitleCase(user.name), value: toTitleCase(user.name) });
    setAltNameOptions(options);
  }, [user, userType]);

  return (
    <div>
      <Image className="mx-auto" src="/2.png" alt="1" width={100} height={0} />
      <hr style={{ height: '2px', color: '#e5e7eb', backgroundColor: '#e5e7eb' }} />
      {userType === ENTITIES.PROPERTY_MANAGER && (
        <>
          <p className="mt-2">{'Hey, ' + (altName ? toTitleCase(altName) : toTitleCase(user?.name))}</p>
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
          />
          <hr style={{ height: '2px', color: '#e5e7eb', backgroundColor: '#e5e7eb' }} />
        </>
      )}
      <div className="mt-4 ml-2 text-lg" style={{ display: 'grid', rowGap: '0.5rem' }}>
        <div className="flex flex-row items-center justify-start">
          <RiFilePaper2Fill className="inline mr-2 my-auto" />
          <Link className={`${router.pathname.includes('/work-orders') ? 'text-black' : 'text-gray-500'} hover:text-slate-400`} href={'/work-orders'}>
            Work Orders
          </Link>
        </div>

        {userType === ENTITIES.PROPERTY_MANAGER && (
          <>
            <div className="flex flex-row items-center justify-start">
              <BsPersonLinesFill className={`inline mr-2 my-auto`} />
              <Link className={`${router.pathname.includes('/property-managers') ? 'text-black' : 'text-gray-500'}  hover:text-slate-400`} href={'/property-managers'}>
                Property Managers
              </Link>
            </div>
            <div className="flex flex-row items-center justify-start">
              <BsFillPersonFill className={`inline mr-2 my-auto`} />
              <Link className={`${router.pathname.includes('/tenants') ? 'text-black' : 'text-gray-500'}  hover:text-slate-400`} href={'/tenants'}>
                Tenants
              </Link>
            </div>
            <div className="flex flex-row items-center justify-start">
              <MdEngineering className={`inline mr-2 my-auto`} />
              <Link className={`${router.pathname.includes('/technicians') ? 'text-black' : 'text-gray-500'}  hover:text-gray-400`} href={'/technicians'}>
                Technicians
              </Link>
            </div>
            <div className="flex flex-row items-center justify-start">
              <CiLocationOn className="inline mr-2 my-auto" />
              <Link className={`${router.pathname.includes('/properties') ? 'text-black' : 'text-gray-500'}  hover:text-gray-400`} href={'/properties'}>
                Properties
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
