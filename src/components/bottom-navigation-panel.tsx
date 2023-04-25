import Link from 'next/link';
import { BsFillPersonFill } from 'react-icons/bs';
import { CiLocationOn } from 'react-icons/ci';
import { RiFilePaper2Fill } from 'react-icons/ri';
import { MdEngineering } from 'react-icons/md';


export const BottomNavigationPanel = () => {
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 dark:bg-gray-700 dark:border-gray-600">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        <Link href="work-orders" type="button" className="inline-flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 group">
          <RiFilePaper2Fill color='white' className='mb-1.5' />
          <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500">Work Orders</span>
        </Link>
        <Link href={"tenants"} type="button" className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group">
          <BsFillPersonFill color='white' className='mb-1.5' />
          <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500">Tenants</span>
        </Link>
        <Link href={"technicians"} type="button" className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group">
          <MdEngineering color='white' className='mb-1.5' />
          <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500">Technicians</span>
        </Link>
        <Link href={"properties"} type="button" className="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group">
          <CiLocationOn color='white' className='mb-1.5' />
          <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500">Properties</span>
        </Link>
      </div>
    </div>
  );
};