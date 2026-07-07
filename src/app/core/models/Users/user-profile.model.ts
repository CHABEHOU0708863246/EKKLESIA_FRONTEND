import { UserPreferences } from "./user-preferences.model";

export interface UserProfile {
  id: string;
  userId: string;
  gender?: string;
  maritalStatus?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  nationalId?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  numberOfChildren?: number;
  profession?: string;
  education?: string;
  notes?: string;
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfileCreate {
  gender?: string;
  maritalStatus?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  nationalId?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  numberOfChildren?: number;
  profession?: string;
  education?: string;
  notes?: string;
  preferences?: UserPreferences;
}

export interface UserProfileUpdate {
  gender?: string;
  maritalStatus?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  nationalId?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  numberOfChildren?: number;
  profession?: string;
  education?: string;
  notes?: string;
  preferences?: UserPreferences;
}

// Classe utilitaire
export class UserProfileUtils {
  static getAge(profile: UserProfile): number {
    if (!profile.dateOfBirth) return 0;
    const birthDate = new Date(profile.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  static getFormattedDateOfBirth(profile: UserProfile): string {
    if (!profile.dateOfBirth) return 'Non renseigné';
    return new Date(profile.dateOfBirth).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  static getGenderLabel(gender?: string): string {
    const labels: Record<string, string> = {
      'Male': 'Homme',
      'Female': 'Femme',
      'Other': 'Autre'
    };
    return gender ? labels[gender] || gender : 'Non renseigné';
  }

  static getMaritalStatusLabel(status?: string): string {
    const labels: Record<string, string> = {
      'Single': 'Célibataire',
      'Married': 'Marié(e)',
      'Divorced': 'Divorcé(e)',
      'Widowed': 'Veuf/Veuve'
    };
    return status ? labels[status] || status : 'Non renseigné';
  }
}
