export type StartKey = { pk: string; sk: string; } | undefined;

export const ENTITIES = {
  PROPERTY: "PROPERTY",
  TENANT: "TENANT",
  WORK_ORDER: "WORK_ORDER",
  PROPERTY_MANAGER: "PROPERTY_MANAGER",
  TECHNICIAN: "TECHNICIAN",
} as const;

export type EntityType = typeof ENTITIES[keyof typeof ENTITIES];