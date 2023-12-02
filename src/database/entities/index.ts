import { validateStartKey } from '@/types/basevalidators';
import { z } from 'zod';

export type StartKey = z.infer<typeof validateStartKey>;

export const ENTITIES = {
  EVENT: 'EVENT',
  ORGANIZATION: 'ORGANIZATION',
  PROPERTY_MANAGER: 'PROPERTY_MANAGER',
  PROPERTY: 'PROPERTY',
  TECHNICIAN: 'TECHNICIAN',
  TENANT: 'TENANT',
  USER: 'USER',
  WORK_ORDER: 'WORK_ORDER',
} as const;

export const ENTITY_KEY = {
  EVENT: 'EV',
  ORGANIZATION: 'ORG',
  PROPERTY_MANAGER: 'PM',
  PROPERTY: 'P',
  TECHNICIAN: 'E',
  TENANT: 'T',
  USER: 'U',
  WORK_ORDER: 'WO',
} as const;

export type EntityTypeKeys = keyof typeof ENTITIES;
export type EntityTypeValues = (typeof ENTITY_KEY)[EntityTypeKeys];

export function generateAddressSk({
  entityKey,
  address,
  country = 'US',
  city,
  state,
  postalCode,
  unit,
}: {
  entityKey: string
  address: string;
  country: string;
  city: string;
  state: string;
  postalCode: string;
  unit?: string;
}) {
  return [
    entityKey,
    'ADDRESS',
    address.toUpperCase(),
    'COUNTRY',
    country.toUpperCase(),
    'CITY',
    city.toUpperCase(),
    'STATE',
    state.toUpperCase(),
    'POSTAL',
    postalCode.toUpperCase(),
    'UNIT',
    unit ? unit?.toUpperCase() : '',
  ].join('#');
}

//Creates a new substring that contains an address in plain text
export function createAddressString({
  address,
  city,
  state,
  postalCode,
  unit,
}: {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  unit?: string;
}) {
  if(!unit) {
    return (
      [
        address.toUpperCase(),
        city.toUpperCase(),
        state.toUpperCase(),
        postalCode.toUpperCase(),
      ].join(' ') + '###'
    );
  }
  return (
    [
      address.toUpperCase(),
      unit.toUpperCase(),
      city.toUpperCase(),
      state.toUpperCase(),
      postalCode.toUpperCase(),
      
    ].join(' ') + '###'
  );
}
