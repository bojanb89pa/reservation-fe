export type ContactInfoType =
  | 'PHONE'
  | 'EMAIL'
  | 'WEBSITE'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'TWITTER'
  | 'LINKEDIN'
  | 'YOUTUBE'
  | 'TIKTOK';

export interface BusinessContactInfo {
  id: string;
  businessId: string;
  type: ContactInfoType;
  value: string;
  label: string | null;
}

export interface AddContactInfoCommand {
  businessId: string;
  type: ContactInfoType;
  value: string;
  label?: string;
}

export interface UpdateContactInfoCommand {
  businessId: string;
  contactInfoId: string;
  type: ContactInfoType;
  value: string;
  label?: string;
}

export interface RemoveContactInfoCommand {
  businessId: string;
  contactInfoId: string;
}
