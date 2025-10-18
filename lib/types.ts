export type EntityType =
  | "PERSON"
  | "EMAIL_ADDRESS"
  | "PHONE_NUMBER"
  | "US_SSN"
  | "CREDIT_CARD"
  | "DATE_TIME"
  | "IP_ADDRESS"
  | "URL"
  | "ADDRESS"
  | "POSTAL_CODE"
  | "LOCATION"
  | "MEDICAL_RECORD_NUMBER"
  | "ACCOUNT_ID"      // <-- add
  | "GENERIC_ID";     // <-- add


export type EntityMatch = {
  type: EntityType;
  text: string;
  start: number;
  end: number;
  score?: number;
};

export type Policy = {
  mode: 'delete' | 'mask';
  entities?: EntityType[];
  mask_map?: Partial<Record<EntityType, string>>;
};
