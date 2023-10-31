import { SessionProviderProps } from "next-auth/react";

export const userIsPillarOwner = (session: SessionProviderProps["session"]): boolean => {
  return session?.user?.email ? [
    "mitchposk@gmail.com",
    "mitchposk+tenant@gmail.com",
    "mitchposk+technician@gmail.com",
    "dylan.m.goren@gmail.com",
    "dylan@gpillarhq.com",
    "jcsavage@umich.edu"
  ].includes(session?.user?.email) : false;
};