/**
 * Téléphone : pays (drapeau + indicatif), normalisation E.164 et affichage
 * lisible. Miroir du backend (PhoneNumberUtil). Défaut : Côte d'Ivoire. (RG-P2-5)
 */
export interface PhoneCountry {
  iso: string;
  name: string;
  dialCode: string;
  minLen: number;
  maxLen: number;
  keepsLeadingZero: boolean;
  flag: string;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'CI', name: "Côte d'Ivoire", dialCode: '+225', minLen: 8, maxLen: 10, keepsLeadingZero: true, flag: '🇨🇮' },
  { iso: 'GN', name: 'Guinée', dialCode: '+224', minLen: 8, maxLen: 9, keepsLeadingZero: false, flag: '🇬🇳' },
  { iso: 'BF', name: 'Burkina Faso', dialCode: '+226', minLen: 8, maxLen: 8, keepsLeadingZero: false, flag: '🇧🇫' },
  { iso: 'SN', name: 'Sénégal', dialCode: '+221', minLen: 9, maxLen: 9, keepsLeadingZero: false, flag: '🇸🇳' },
  { iso: 'TG', name: 'Togo', dialCode: '+228', minLen: 8, maxLen: 8, keepsLeadingZero: false, flag: '🇹🇬' },
  { iso: 'ML', name: 'Mali', dialCode: '+223', minLen: 8, maxLen: 8, keepsLeadingZero: false, flag: '🇲🇱' },
  { iso: 'CM', name: 'Cameroun', dialCode: '+237', minLen: 9, maxLen: 9, keepsLeadingZero: false, flag: '🇨🇲' },
  { iso: 'KW', name: 'Koweït', dialCode: '+965', minLen: 8, maxLen: 8, keepsLeadingZero: false, flag: '🇰🇼' },
  { iso: 'FR', name: 'France', dialCode: '+33', minLen: 9, maxLen: 9, keepsLeadingZero: false, flag: '🇫🇷' },
  { iso: 'BE', name: 'Belgique', dialCode: '+32', minLen: 8, maxLen: 9, keepsLeadingZero: false, flag: '🇧🇪' },
  { iso: 'US', name: 'États-Unis', dialCode: '+1', minLen: 10, maxLen: 10, keepsLeadingZero: false, flag: '🇺🇸' },
  { iso: 'CA', name: 'Canada', dialCode: '+1', minLen: 10, maxLen: 10, keepsLeadingZero: false, flag: '🇨🇦' },
];

export const DEFAULT_PHONE_ISO = 'CI';

export function findPhoneCountry(iso?: string | null): PhoneCountry {
  const c = PHONE_COUNTRIES.find((x) => x.iso === (iso ?? '').toUpperCase());
  return c ?? PHONE_COUNTRIES[0];
}

function digitsOnly(raw: string): string {
  return (raw ?? '').replace(/\D+/g, '');
}

export interface PhoneValidation {
  ok: boolean;
  e164?: string;
  reason?: string;
}

export function toE164(raw: string, defaultIso?: string): PhoneValidation {
  const s = (raw ?? '').trim();
  if (!s) return { ok: false, reason: 'Numéro vide.' };

  let country = findPhoneCountry(defaultIso);
  let dialDigits: string;
  let national: string;

  const hasPlus = s.startsWith('+');
  const hasDoubleZero = s.startsWith('00');
  if (hasPlus || hasDoubleZero) {
    const d = digitsOnly(hasPlus ? s.slice(1) : s.slice(2));
    const match = [...PHONE_COUNTRIES]
      .sort((a, b) => b.dialCode.length - a.dialCode.length)
      .find((c) => d.startsWith(c.dialCode.replace('+', '')));
    if (!match) return { ok: false, reason: 'Indicatif pays inconnu.' };
    country = match;
    dialDigits = match.dialCode.replace('+', '');
    national = d.length > dialDigits.length ? d.slice(dialDigits.length) : '';
  } else {
    let d = digitsOnly(s);
    if (!country.keepsLeadingZero && d.startsWith('0')) d = d.replace(/^0+/, '');
    dialDigits = country.dialCode.replace('+', '');
    national = d;
  }

  if (national.length < country.minLen || national.length > country.maxLen) {
    return { ok: false, reason: `Numéro invalide pour ${country.name} (${country.dialCode}).` };
  }
  return { ok: true, e164: `+${dialDigits}${national}` };
}

/** Sépare un E.164 en (pays, numéro national) pour pré-remplir le composant. */
export function splitE164(e164?: string | null): { iso: string; national: string } {
  const s = (e164 ?? '').trim();
  if (!s.startsWith('+')) return { iso: DEFAULT_PHONE_ISO, national: digitsOnly(s) };
  const match = [...PHONE_COUNTRIES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((c) => s.startsWith(c.dialCode));
  if (!match) return { iso: DEFAULT_PHONE_ISO, national: digitsOnly(s) };
  return { iso: match.iso, national: s.slice(match.dialCode.length) };
}

export function formatReadablePhone(e164?: string | null): string {
  const s = (e164 ?? '').trim();
  if (!s.startsWith('+')) return s;
  const { iso, national } = splitE164(s);
  const dial = findPhoneCountry(iso).dialCode;
  return `${dial} ${national.replace(/(\d{2})(?=\d)/g, '$1 ')}`.trim();
}
