
import { IUser } from "@/database/entities/user";
import { useSession } from "next-auth/react";



export const useSessionUser = () => {
  const session = useSession();
  const user = (session.data?.user ?? null) as IUser | null;
  const sessionStatus = session.status;

  return {
    user,
    sessionStatus
  };
};