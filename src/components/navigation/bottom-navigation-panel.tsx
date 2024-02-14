import Link from 'next/link';
import { BsFillPersonFill } from 'react-icons/bs';
import { CiLocationOn } from 'react-icons/ci';
import { RiFilePaper2Fill } from 'react-icons/ri';
import { MdEngineering } from 'react-icons/md';
import { ENTITIES } from '@/database/entities';
import { useUserContext } from '@/context/user';
import { useRouter } from 'next/router';

export const BottomNavigationPanel = () => {
  const { userType } = useUserContext();
  const router = useRouter();

  if (userType !== ENTITIES.PROPERTY_MANAGER) return null;
  return (
    <>
      {/* Allows us to use fixed and prevent content from being hidden by bottom nav */}
      <div className="btm-nav h-24 sticky opacity-0 pointer-events-none"></div>
      <div className="btm-nav z-30 h-20 bg-base-300 fixed bottom-0 left-0 text-black text-md border-t-2 border-neutral border-opacity-10">
        <Link
          href={'work-orders'}
          type="button"
          className={`${userType !== ENTITIES.PROPERTY_MANAGER && 'col-span-4'} ${router.pathname.includes('/work-orders') && 'bg-base-100'}`}
        >
          <RiFilePaper2Fill />
          <span className="">Work Orders</span>
        </Link>
        {userType === ENTITIES.PROPERTY_MANAGER && (
          <>
            <Link href={'tenants'} className={`${router.pathname.includes('/tenants') && 'bg-base-100'}`} type="button">
              <BsFillPersonFill />
              <span className="">Tenants</span>
            </Link>
            <Link href={'technicians'} type="button" className={`${router.pathname.includes('/technicians') && 'bg-base-100'}`}>
              <MdEngineering />
              <span className="">Technicians</span>
            </Link>
            <Link href={'properties'} type="button" className={`${router.pathname.includes('/properties') && 'bg-base-100'}`}>
              <CiLocationOn />
              <span className="">Properties</span>
            </Link>
          </>
        )}
      </div>
    </>
  );
};
