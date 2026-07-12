import { UserProfile, UserProfileCreate, UserProfileUpdate } from "./user-profile.model";

export interface User {
  memberId: any;
  id: string;
  username: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  fullName: string;
  photoUrl?: string;
  isActive: boolean;
  roles: string[] | null;
  permissions: string[];
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
  churchId?: string;
  churchName?: string;
  profile?: UserProfile;
}

export interface UserCreate {
  username: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  photoUrl?: string;
  roles?: string[];
  churchId?: string;   // ✅ Ajout
  siteId?: string;     // ✅ Ajout
  memberId?: string;
  profile?: UserProfileCreate;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  isActive?: boolean;
  roles?: string[];
  permissions?: string[];
  churchId?: string;   // ✅ Ajout
  siteId?: string;     // ✅ Ajout
  memberId?: string;
  profile?: UserProfileUpdate;
}

export interface UserFilter {
  username?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  isActive?: boolean;
  roles?: string[];
  churchId?: string;
  createdFrom?: string;
  createdTo?: string;
  lastLoginFrom?: string;
  lastLoginTo?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface UserListResponse {
  items: User[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface UserChangePassword {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Classe utilitaire
export class UserUtils {
  static getFullName(user: User | UserCreate): string {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  static getFormattedDate(date?: string): string {
    if (!date) return 'Non renseigné';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getInitials(user: User | UserCreate): string {
    const firstName = user.firstName?.charAt(0) || '';
    const lastName = user.lastName?.charAt(0) || '';
    return `${firstName}${lastName}`.toUpperCase();
  }

  static getStatusColor(isActive: boolean): string {
    return isActive ? 'success' : 'danger';
  }

  static getStatusLabel(isActive: boolean): string {
    return isActive ? 'Actif' : 'Inactif';
  }
}

// Valeurs par défaut
export const DEFAULT_USER_FILTER: UserFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};
