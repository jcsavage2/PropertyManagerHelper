export type StartKey = { pk: string; sk: string; } | undefined;

export const ENTITIES = {
  PROPERTY: "PROPERTY",
  TENANT: "TENANT",
  WORK_ORDER: "WORK_ORDER",
  PROPERTY_MANAGER: "PROPERTY_MANAGER",
  TECHNICIAN: "TECHNICIAN",
  EVENT: "EVENT",
  USER: "USER"
} as const;

export const ENTITY_KEY = {
  PROPERTY: "P",
  TENANT: "T",
  WORK_ORDER: "WO",
  PROPERTY_MANAGER: "PM",
  TECHNICIAN: "E",
  EVENT: "EV",
  USER: "U"
} as const;

export type EntityTypeKeys = keyof typeof ENTITY_KEY;
export type EntityTypeValues = typeof ENTITY_KEY[EntityTypeKeys];
