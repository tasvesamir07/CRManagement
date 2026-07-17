export interface ValidationMessages {
  required: (field: string) => string;
  minLength: (field: string, min: number) => string;
  maxLength: (field: string, max: number) => string;
  invalid: (field: string) => string;
}

export interface FormMessages {
  noticesEmpty: string;
  noticeTitleRequired: (i: number) => string;
  customTextEmpty: string;
  fileRequired: string;
  platformsRequired: string;
  scheduleDateTimeRequired: string;
  draftFirst: string;
  offlineBroadcast: string;
}

export interface ApiMessages {
  networkSaveFailed: string;
  draftSaved: string;
  draftUpdated: string;
  draftSavedOffline: string;
  scheduled: (date: string | number | Date) => string;
}

export const VALIDATION: ValidationMessages = {
  required: (field: string) => `${field} is required`,
  minLength: (field: string, min: number) => `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) => `${field} must not exceed ${max} characters`,
  invalid: (field: string) => `Invalid ${field}`,
};

export const FORM_MESSAGES: FormMessages = {
  noticesEmpty: 'Please add at least one notice.',
  noticeTitleRequired: (i: number) => `Please provide a title for Notice #${i + 1}.`,
  customTextEmpty: 'Please write the notice body.',
  fileRequired: 'Please upload at least one file.',
  platformsRequired: 'Please select at least one channel.',
  scheduleDateTimeRequired: 'Please select a date and time.',
  draftFirst: 'Please save the draft first.',
  offlineBroadcast: 'Cannot broadcast while offline. Saving notice as a local draft...',
};

export const API_MESSAGES: ApiMessages = {
  networkSaveFailed: 'Network save failed. Saving locally...',
  draftSaved: 'Draft saved!',
  draftUpdated: 'Draft updated!',
  draftSavedOffline: 'Draft saved offline (will sync when online)',
  scheduled: (date: string | number | Date) => `Scheduled for ${new Date(date).toLocaleString()}`,
};
