import Image from 'next/image';
import { useUserContext } from "@/context/user";
import Link from 'next/link';
import { CiLocationOn } from "react-icons/ci";
import { RiFilePaper2Fill } from "react-icons/ri";
import { BsFillPersonFill } from "react-icons/bs";
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import axios from "axios";
import { AddTenantModal } from '@/components/add-tenant-modal';
import { toTitleCase } from '@/utils';

const Tenants = () => {
  const [tenantModalIsOpen, setTenantModalIsOpen] = useState(false);
  const { user } = useUserContext();
  const [tenants, setTenants] = useState([]);
  const router = useRouter();


  useEffect(() => {
    if (user.pmEmail) {
      async function get() {
        const { data } = await axios.post("/api/get-all-tenants-for-pm", { propertyManagerEmail: user.pmEmail });
        const tenants = JSON.parse(data.response);
        tenants.length && setTenants(tenants);
      }
      get();
    }
  }, [user.pmEmail]);

  const refetch = useCallback(async () => {
    const { data } = await axios.post("/api/get-all-tenants-for-pm", { propertyManagerEmail: user.pmEmail });
    const tenants = JSON.parse(data.response);
    tenants.length && setTenants(tenants);
  }, [user.pmEmail]);

  return (
    <div id="testing" className="mx-4 mt-4" style={{ display: "grid", gridTemplateColumns: "1fr 3fr", columnGap: "2rem" }}>
      <div>
        <Image className="mx-auto" src="/2.png" alt='1' width={100} height={0} />
        <hr style={{ height: "2px", color: "#e5e7eb", backgroundColor: "#e5e7eb" }} />
        <div className="mt-4 ml-2 text-lg" style={{ display: "grid", rowGap: "0.5rem" }}>
          <div className='inline'>
            <RiFilePaper2Fill className='inline mr-1 my-auto' />
            <Link className={`${router.pathname === "/work-orders" ? "text-gray-800" : "text-gray-500"} hover:text-slate-400`} href={"work-orders"}>Work Orders</Link>
          </div>
          <div className='inline'>
            <BsFillPersonFill className={`inline mr-1 my-auto`} />
            <Link className={`${router.pathname === "/tenants" ? "text-gray-800" : "text-gray-500"} hover:text-slate-400`} href={"tenants"}>Tenants</Link>
          </div>
          <div className='inline'>
            <CiLocationOn className='inline mr-1 my-auto' />
            <Link className={`${router.pathname === "/properties" ? "text-gray-800" : "text-gray-500"} hover:text-slate-400`} href={"properties"}>Properties</Link>
          </div>
        </div>
      </div>
      <div className="lg:max-w-3xl">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <h1 className="text-4xl">Tenants</h1>
          <button
            className="bg-blue-200 p-2 mb-auto text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 h-6/12 w-40 justify-self-end text-center "
            onClick={() => setTenantModalIsOpen(true)}
          >+ New Tenant</button>
        </div>
        <table className='w-full mt-8'>
          <thead className=''>
            <tr className='text-left text-gray-400'>
              <th className='font-normal'>Name</th>
              <th className='font-normal'>Status</th>
              <th className='font-normal'>Primary Address</th>
              <th className='font-normal'>Created</th>
            </tr>
          </thead>
          <tbody className='text-gray-700'>
            {tenants.map((tenant: any) => {
              const date = new Date(tenant.created);
              const primaryAddress: any = Object.values(tenant.addresses ?? []).find((a: any) => !!a.isPrimary);
              return (
                <tr
                  key={`${tenant.pk}-${tenant.sk}`}
                >
                  <td>
                    {`${toTitleCase(tenant.tenantName)}`}
                  </td>
                  <td>
                    {tenant.status}
                  </td>
                  <td>
                    {primaryAddress.address}
                  </td>
                  <td>
                    {`${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AddTenantModal tenantModalIsOpen={tenantModalIsOpen} setTenantModalIsOpen={setTenantModalIsOpen} onSuccessfulAdd={refetch} />
    </div >
  );
};

export default Tenants;