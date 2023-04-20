import { useUserContext } from "@/context/user";
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import axios from "axios";
import { AddTenantModal } from '@/components/add-tenant-modal';
import { toTitleCase } from '@/utils';
import { PortalLeftPanel } from '@/components/portal-left-panel';

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
      <PortalLeftPanel />
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