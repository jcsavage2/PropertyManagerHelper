export type StartKey = { pk: string; sk: string; } | undefined;

export const ENTITIES = {
  EVENT: "EVENT",
  ORGANIZATION: "ORG",
  PROPERTY_MANAGER: "PROPERTY_MANAGER",
  PROPERTY: "PROPERTY",
  TECHNICIAN: "TECHNICIAN",
  TENANT: "TENANT",
  USER: "USER",
  WORK_ORDER: "WORK_ORDER",
} as const;

export const ENTITY_KEY = {
  EVENT: "EV",
  ORGANIZATION: "ORG",
  PROPERTY_MANAGER: "PM",
  PROPERTY: "P",
  TECHNICIAN: "E",
  TENANT: "T",
  USER: "U",
  WORK_ORDER: "WO",
} as const;

export type EntityTypeKeys = keyof typeof ENTITY_KEY;
export type EntityTypeValues = typeof ENTITY_KEY[EntityTypeKeys];
