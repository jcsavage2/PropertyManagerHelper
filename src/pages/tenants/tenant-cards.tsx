import { toTitleCase } from "@/utils";
import { ITenant } from "@/database/entities/tenant";
import { useUserContext } from "@/context/user";
import { useDevice } from "@/hooks/use-window-size";
import { LoadingSpinner } from "@/components/loading-spinner/loading-spinner";

interface ITenantCardsProps {
  tenants: ITenant[];
  tenantsLoading: boolean;
}

export const TenantsCards = ({tenants, tenantsLoading}: ITenantCardsProps) => {
  const { userType } = useUserContext();
  const { isMobile } = useDevice();

  if (userType !== "PROPERTY_MANAGER") {
    return (
      <p>
        You must be using the property manager view to see this page, and your account must have the appropriate role.
      </p>
    );
  }

  return (
    <>
      {tenantsLoading ? (
        <div className="mt-8">
          <LoadingSpinner spinnerClass="spinner-large" />
        </div>
      ) : tenants && tenants.length ? (
        <div className={`mt-8 ${isMobile ? " pb-24" : "pb-0"}`}>
          <div className="grid gap-y-2">
            {tenants.map((tenant, index) => {
              return (
                <div className="py-4 px-2 bg-gray-100 rounded w-full" key={`${tenant.pk}-${tenant.sk}-${index}`}>
                  <p className="text-xl text-gray-800">{toTitleCase(tenant.tenantName)} </p>
                  <p className="text-sm mt-1">{tenant.tenantEmail} </p>
                  <p className="text-sm mt-1">{tenant.status} </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4 text-lg font-bold text-center">No tenant data.</div>
      )}
    </>
  );
};

export default TenantsCards;
