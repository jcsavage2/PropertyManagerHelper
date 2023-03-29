import { useUserContext } from "@/context/user";

const Portal = () => {
  const { user, createUserInDB } = useUserContext();

  const { name, organization, tenants } = user;

  console.log({ tenants, user });
  return (
    <div className="ml-4 mt-4">
      <p>{`Hello${name ? ` ${name}` : ""}!`}</p>
      <p>{organization ? `${organization}` : `You aren't yet part of an organization!`}</p>
      <button
        className="bg-blue-200 p-3 text-gray-600 hover:bg-blue-300 rounded disabled:opacity-25 mt-4"
        onClick={() => createUserInDB({ email: "mitchposk+123@gmail.com", userType: "TENANT", propertyManagerEmail: user.email })}>Add New Tenant</button>
      <br />

      <h3 className="font-bold mt-4">Tenants:</h3>
      {tenants.map(t => {
        return (
          <div key={t}>
            {t}
          </div>
        );
      })}

    </div>
  );
};

export default Portal;