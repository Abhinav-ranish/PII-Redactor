export type EntityType =
  | 'PERSON' | 'EMAIL_ADDRESS' | 'PHONE_NUMBER' | 'US_SSN' | 'CREDIT_CARD'
  | 'DATE_TIME' | 'IP_ADDRESS' | 'URL' | 'LOCATION' | 'POSTAL_CODE'
  | 'ADDRESS' | 'MEDICAL_RECORD_NUMBER';

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
