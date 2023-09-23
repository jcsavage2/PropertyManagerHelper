
import { IUser } from "@/database/entities/user";
import { useSession } from "next-auth/react";
import router from "next/router";

export const useSessionUser = () => {
  const session = useSession();
  const user = (session.data?.user ?? null) as IUser | null;
  const sessionStatus = session.status;
  const pathname = typeof window !== 'undefined' && window.location?.pathname;

  //Only allow logged out users to see home, t&c, and privacy policy
  if(sessionStatus === 'unauthenticated' && pathname && pathname !== '/' && pathname !== '/terms-and-conditions' && pathname !== '/privacy-policy') {
    router.push('/')
  }

  return {
    user,
    sessionStatus
  };
};