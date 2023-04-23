export type StartKey = { pk: string; sk: string; } | undefined;

export const ENTITIES = {
  PROPERTY: "PROPERTY",
  TENANT: "TENANT",
  WORK_ORDER: "WORK_ORDER",
  PROPERTY_MANAGER: "PROPERTY_MANAGER",
  TECHNICIAN: "TECHNICIAN",
  EVENT: "EVENT",
} as const;

export const ENTITY_KEY = {
  PROPERTY: "P",
  TENANT: "T",
  WORK_ORDER: "WO",
  PROPERTY_MANAGER: "PM",
  TECHNICIAN: "E",
  EVENT: "EV",
} as const;

export type EntityType = typeof ENTITIES[keyof typeof ENTITIES];
export type EntityKeyType = typeof ENTITY_KEY[keyof typeof ENTITY_KEY];