
import { ServiceTime } from './site.model';

export interface ChurchSettings {
  defaultLanguage: string;
  timezone: string;
  currency: string;
  fiscalYearStart: number;
  serviceTimes: ServiceTime[];
}

export interface ChurchSettingsUpdate {
  defaultLanguage?: string;
  timezone?: string;
  currency?: string;
  fiscalYearStart?: number;
  serviceTimes?: ServiceTime[];
}

// Langues disponibles
export const AVAILABLE_LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' }
];

// Fuseaux horaires disponibles
export const AVAILABLE_TIMEZONES = [
  { value: 'Africa/Abidjan', label: 'Abidjan (UTC+0)' },
  { value: 'Africa/Dakar', label: 'Dakar (UTC+0)' },
  { value: 'Africa/Lagos', label: 'Lagos (UTC+1)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (UTC+3)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
  { value: 'Europe/London', label: 'Londres (UTC+0)' },
  { value: 'America/New_York', label: 'New York (UTC-4)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-7)' }
];

// Devises disponibles
export const AVAILABLE_CURRENCIES = [
  { value: 'FCFA', label: 'FCFA (CFA Franc)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dollar US ($)' },
  { value: 'GBP', label: 'Livre Sterling (£)' },
  { value: 'CAD', label: 'Dollar Canadien (CA$)' }
];

// Jours de la semaine
export const WEEK_DAYS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche'
];

// Mois pour l'année fiscale
export const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' }
];

// Types de service
export const SERVICE_TYPES = [
  'Matin',
  'Soir',
  'Jeunes',
  'Enfants',
  'Louange',
  'Prière',
  'Étude Biblique',
  'Autre'
];

// Classe utilitaire
export class ChurchSettingsUtils {
  static getLanguageLabel(value: string): string {
    const lang = AVAILABLE_LANGUAGES.find(l => l.value === value);
    return lang?.label || value;
  }

  static getTimezoneLabel(value: string): string {
    const tz = AVAILABLE_TIMEZONES.find(t => t.value === value);
    return tz?.label || value;
  }

  static getCurrencyLabel(value: string): string {
    const curr = AVAILABLE_CURRENCIES.find(c => c.value === value);
    return curr?.label || value;
  }

  static getMonthLabel(value: number): string {
    const month = MONTHS.find(m => m.value === value);
    return month?.label || value.toString();
  }

  static getDefaultSettings(): ChurchSettings {
    return {
      defaultLanguage: 'fr',
      timezone: 'Africa/Abidjan',
      currency: 'FCFA',
      fiscalYearStart: 1,
      serviceTimes: []
    };
  }

  static validateSettings(settings: ChurchSettings): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!settings.defaultLanguage) {
      errors.push('La langue par défaut est requise');
    }

    if (!settings.timezone) {
      errors.push('Le fuseau horaire est requis');
    }

    if (!settings.currency) {
      errors.push('La devise est requise');
    }

    if (settings.fiscalYearStart < 1 || settings.fiscalYearStart > 12) {
      errors.push('Le mois de début d\'exercice doit être entre 1 et 12');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
