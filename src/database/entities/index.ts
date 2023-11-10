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
