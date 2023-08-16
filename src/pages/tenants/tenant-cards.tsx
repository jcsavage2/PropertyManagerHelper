import { toTitleCase } from "@/utils";
import { useEffect, useState } from "react";
import { ITenant } from "@/database/entities/tenant";
import axios from "axios";
import { useUserContext } from "@/context/user";
import { useDevice } from "@/hooks/use-window-size";
import { useSessionUser } from "@/hooks/auth/use-session-user";


export const TenantsCards = () => {
  const [tenants, setTenants] = useState<Array<ITenant>>([]);

  const { user } = useSessionUser();
  const { userType } = useUserContext();
  const { isMobile } = useDevice();

  useEffect(() => {
    async function get() {
      if (!user) return;
      const { data } = await axios.post("/api/get-all-tenants-for-pm", { propertyManagerEmail: user.email });
      const tenants: ITenant[] = JSON.parse(data.response);
      if (tenants.length) {
        setTenants(tenants);
      }
    }
    get();
  }, [user]);

  if (userType !== "PROPERTY_MANAGER") {
    return (
      <p>
        You must be using the property manager view to see this page, and your account must have the appropriate role.
      </p>
    );
  }

  return (
    <div className={`mt-8 ${isMobile ? " pb-24" : "pb-0"}`}>
      <div className="grid gap-y-2">
        {tenants.map((tenant, index) => {
          return (
            <div
              className="py-4 px-2 bg-gray-100 rounded w-full"
              key={`${tenant.pk}-${tenant.sk}-${index}`}
            >
              <p className="text-xl text-gray-800">{toTitleCase(tenant.tenantName)} </p>
              <p className="text-sm mt-1">{tenant.tenantEmail} </p>
              <p className="text-sm mt-1">{tenant.status} </p>
            </div>
          );
        })}
      </div >
    </div>
  );
};

export default TenantsCards;