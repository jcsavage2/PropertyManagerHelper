import { useUserContext } from "@/context/user";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import { userIsPropertyManager, userIsTenant } from "@/utils/user-types";

const HamburgerMenu = () => {
  const { user, logOut, sessionUser } = useUserContext();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const linkStyle = "hover:text-gray-500 my-auto text-3xl text-white cursor-pointer mt-12";

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = useCallback(() => {
    //@ts-ignore
    if (user.pmEmail || user.tenantEmail || user.userType === "TECHNICIAN") {
      logOut();
      router.push("/");
    }
  }, [user, logOut, router]);

  return (
    <>
      <div className="space-y-1 justify-self-end" onClick={() => setIsOpen(s => !s)}>
        <span className="block w-8 h-1 bg-gray-600"></span>
        <span className="block w-8 h-1 bg-gray-600"></span>
        <span className="block w-8 h-1 bg-gray-600"></span>
      </div>
      {isOpen && (
        <div
          className="absolute left-0 bg-blue-400 mt-0 w-full grid z-10"
          style={{ top: "7dvh", height: "93dvh" }}
          onClick={() => setIsOpen(false)}
        >
          <div className="mt-4 flex flex-col h-12">
            <Link className={linkStyle} href={"/"}>Home</Link>
            {userIsPropertyManager(user) && <Link className={linkStyle} href={"/work-orders"}>Admin Portal</Link>}
            {userIsTenant(user) && <Link className={linkStyle} href={"/work-order-chatbot"}>New Work Order</Link>}
            {userIsTenant(user) && <Link className={linkStyle} href={"/tenant-work-orders"}>Work Orders</Link>}
            {sessionUser?.email && (<Link onClick={handleClick} className={linkStyle} href={"/"}>{"Sign Out"}</Link>)}
            {!sessionUser?.email && (<Link onClick={() => signIn()} className={linkStyle} href={"/"}>{"Sign In"}</Link>)}

          </div>
        </div>
      )}
    </>
  );
};

export default HamburgerMenu;