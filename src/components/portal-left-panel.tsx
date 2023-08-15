
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BsFillPersonFill } from 'react-icons/bs';
import { CiLocationOn } from 'react-icons/ci';
import { RiFilePaper2Fill } from 'react-icons/ri';
import { MdEngineering } from 'react-icons/md';
import { useUserContext } from '@/context/user';
import { useSessionUser } from '@/hooks/auth/use-session-user';


export const PortalLeftPanel = () => {
  const router = useRouter();
  const { userType } = useUserContext();
  const { user } = useSessionUser();

  return (
    < div >
      <Image className="mx-auto" src="/2.png" alt='1' width={100} height={0} />
      <hr style={{ height: "2px", color: "#e5e7eb", backgroundColor: "#e5e7eb" }} />
      <div className="mt-4 ml-2 text-lg" style={{ display: "grid", rowGap: "0.5rem" }}>
        <div className='inline'>
          <RiFilePaper2Fill className='inline mr-1 my-auto' />
          <Link className={`${router.pathname === "/work-orders" ? "text-gray-800" : "text-gray-500"} hover:text-slate-400`} href={"work-orders"}>Work Orders</Link>
        </div>

        {userType === "PROPERTY_MANAGER" && (
          <>
            <div className='inline'>
              <BsFillPersonFill className={`inline mr-1 my-auto`} />
              <Link className={`${router.pathname === "/tenants" ? "text-gray-800" : "text-gray-500"} hover:text-slate-400`} href={"tenants"}>Tenants</Link>
            </div>
            <div className='inline'>
              <MdEngineering className={`inline mr-1 my-auto`} />
              <Link className={`${router.pathname === "/technicians" ? "text-gray-800" : "text-gray-500"} hover:text-slate-400`} href={"technicians"}>Technicians</Link>
            </div>
            <div className='inline'>
              <CiLocationOn className='inline mr-1 my-auto' />
              <Link className={`${router.pathname === "/properties" ? "text-gray-800" : "text-gray-500"} hover:text-slate-400`} href={"properties"}>Properties</Link>
            </div>
          </>
        )}
      </div>
    </div >
  );
};