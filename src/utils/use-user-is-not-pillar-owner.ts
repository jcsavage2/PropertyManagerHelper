import { IUser } from '@/database/entities/user';

export const userIsPillarOwner = (user: IUser): boolean => {
  return user?.email
    ? [
        'mitchposk@gmail.com',
        'mitchposk+tenant@gmail.com',
        'mitchposk+technician@gmail.com',
        'dylan.m.goren@gmail.com',
        'dylan@gpillarhq.com',
        'jcsavage@umich.edu',
      ].includes(user?.email)
    : false;
};
