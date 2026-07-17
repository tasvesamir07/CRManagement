interface CountryCode {
  code: string;
  label: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '880', label: 'BD (+880)', flag: '🇧🇩' },
  { code: '91', label: 'IN (+91)', flag: '🇮🇳' },
  { code: '92', label: 'PK (+92)', flag: '🇵🇰' },
  { code: '1', label: 'US/CA (+1)', flag: '🇺🇸' },
  { code: '44', label: 'UK (+44)', flag: '🇬🇧' },
  { code: '966', label: 'SA (+966)', flag: '🇸🇦' },
  { code: '971', label: 'AE (+971)', flag: '🇦🇪' },
  { code: '60', label: 'MY (+60)', flag: '🇲🇾' },
  { code: '65', label: 'SG (+65)', flag: '🇸🇬' },
  { code: '61', label: 'AU (+61)', flag: '🇦🇺' },
  { code: '90', label: 'TR (+90)', flag: '🇹🇷' },
  { code: 'custom', label: 'Custom...', flag: '🌐' }
];

export const sanitizePhoneNumber = (countryCode: string, phoneNumber: string): string => {
  const cleanCode = countryCode.replace(/\D/g, '');
  let cleanNumber = phoneNumber.replace(/\D/g, '');
  if (cleanNumber.startsWith(cleanCode)) return cleanNumber;
  if (cleanNumber.startsWith('0')) cleanNumber = cleanNumber.substring(1);
  return cleanCode + cleanNumber;
};
