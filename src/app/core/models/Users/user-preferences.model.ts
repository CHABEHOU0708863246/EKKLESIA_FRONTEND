export interface UserPreferences {
  theme: string;
  notifications: NotificationPreferences;
  language: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  eventReminders: boolean;
}

// Valeurs par défaut
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'light',
  notifications: {
    email: true,
    sms: false,
    push: true,
    eventReminders: true
  },
  language: 'fr'
};

// Classe utilitaire
export class UserPreferencesUtils {
  static getAvailableThemes(): { value: string; label: string }[] {
    return [
      { value: 'light', label: 'Clair' },
      { value: 'dark', label: 'Sombre' },
      { value: 'system', label: 'Système' }
    ];
  }

  static getAvailableLanguages(): { value: string; label: string }[] {
    return [
      { value: 'fr', label: 'Français' },
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Español' }
    ];
  }
}
