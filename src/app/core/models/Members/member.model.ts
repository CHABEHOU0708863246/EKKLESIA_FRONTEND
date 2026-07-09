// src/app/core/models/members/member.model.ts

export enum MemberStatus {
  Visitor = 'Visitor',
  Adherent = 'Adherent',
  Active = 'Active',
  Inactive = 'Inactive',
  ExMember = 'ExMember'
}

export enum VisitorStage {
  FirstContact = 'FirstContact',
  Invited = 'Invited',
  InClass = 'InClass',
  Adhered = 'Adhered'
}

export enum SpiritualStatus {
  NonBeliever = 'NonBeliever',
  Catechumen = 'Catechumen',
  Believer = 'Believer',
  Baptized = 'Baptized',
  Disciple = 'Disciple',
  Leader = 'Leader'
}

export enum AttachmentType {
  JustificatifPhoto = 'JustificatifPhoto',
  CNI = 'CNI',
  CertificatBapteme = 'CertificatBapteme',
  Other = 'Other'
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  fullAddress: string;
  formattedAddress: string;
}

export interface FamilyMember {
  relation: string;
  memberId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isMember: boolean;
  fullName: string;
}

export interface MemberNote {
  content: string;
  type: string;
  createdAt: string;
  createdBy: string;
  isPrivate: boolean;
}

export interface MemberAttachment {
  id: string;
  type: AttachmentType;
  typeLabel: string;
  fileUrl: string;
  label?: string;
  uploadedAt: string;
  uploadedBy: string;
  isActive: boolean;
  formattedUploadedAt: string;
}

export interface Member {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: Address;
  photoUrl?: string;
  attachments: MemberAttachment[];
  status: MemberStatus;
  visitorStage?: VisitorStage;
  visitorStageLabel?: string;
  spiritualStatus: SpiritualStatus;
  baptismDate?: string;
  baptismPlace?: string;
  baptizedBy?: string;
  conversionDate?: string;
  adhesionDate?: string;
  spiritualGifts: string[];
  cellGroupId?: string;
  cellGroupName?: string;
  ministryIds: string[];
  ministryNames: string[];
  churchId: string;
  churchName?: string;
  siteId?: string;
  siteName?: string;
  godfatherId?: string;
  godfatherName?: string;
  familyMembers: FamilyMember[];
  isActive: boolean;
  isBaptized: boolean;
  isLeader: boolean;
  lastAttendance?: string;
  attendanceCount: number;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  notes: MemberNote[];
  age: number;
  // ✅ Propriétés de réponse
  isSuccess?: boolean;
  errorMessage?: string;
}

export interface MemberCreate {
  userId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: Address;
  photoUrl?: string;
  attachments?: MemberAttachment[];
  status?: MemberStatus;
  visitorStage?: VisitorStage;
  spiritualStatus?: SpiritualStatus;
  baptismDate?: string;
  baptismPlace?: string;
  baptizedBy?: string;
  conversionDate?: string;
  adhesionDate?: string;
  spiritualGifts?: string[];
  cellGroupId?: string;
  ministryIds?: string[];
  churchId: string;
  siteId?: string;
  godfatherId?: string;
  familyMembers?: FamilyMember[];
  isActive?: boolean;
  isBaptized?: boolean;
  isLeader?: boolean;
}

export interface MemberUpdate {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: Address;
  photoUrl?: string;
  attachments?: MemberAttachment[];
  status?: MemberStatus;
  visitorStage?: VisitorStage;
  spiritualStatus?: SpiritualStatus;
  baptismDate?: string;
  baptismPlace?: string;
  baptizedBy?: string;
  conversionDate?: string;
  adhesionDate?: string;
  spiritualGifts?: string[];
  cellGroupId?: string;
  ministryIds?: string[];
  siteId?: string;
  godfatherId?: string;
  familyMembers?: FamilyMember[];
  isActive?: boolean;
  isBaptized?: boolean;
  isLeader?: boolean;
  notes?: MemberNote[];
}

export interface MemberFilter {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  status?: MemberStatus;
  visitorStage?: VisitorStage;
  spiritualStatus?: SpiritualStatus;
  isActive?: boolean;
  isBaptized?: boolean;
  isLeader?: boolean;
  cellGroupId?: string;
  ministryId?: string;
  churchId?: string;
  siteId?: string;
  godfatherId?: string;
  baptizedFrom?: string;
  baptizedTo?: string;
  createdFrom?: string;
  createdTo?: string;
  lastAttendanceFrom?: string;
  lastAttendanceTo?: string;
  minAttendanceCount?: number;
  maxAttendanceCount?: number;
  hasAttachments?: boolean;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface MemberListResponse {
  items: Member[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface MemberSummary {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  visitors: number;
  adherents: number;
  baptizedMembers: number;
  nonBaptizedMembers: number;
  leaders: number;
  membersByStatus: Record<MemberStatus, number>;
  membersBySpiritualStatus: Record<SpiritualStatus, number>;
  membersByCellGroup: Record<string, number>;
  membersByGender: Record<string, number>;
  membersByAgeGroup: Record<number, number>;
  visitorsByStage?: Record<VisitorStage, number>;
  recentMembers: Member[];
  mostActiveMembers: Member[];
  membersNeedingFollowUp: Member[];
  averageAge: number;
  baptismRate: number;
}

// ✅ Labels
export const MemberStatusLabels: Record<MemberStatus, string> = {
  [MemberStatus.Visitor]: 'Visiteur',
  [MemberStatus.Adherent]: 'Adhérent',
  [MemberStatus.Active]: 'Actif',
  [MemberStatus.Inactive]: 'Inactif',
  [MemberStatus.ExMember]: 'Ancien membre'
};

export const VisitorStageLabels: Record<VisitorStage, string> = {
  [VisitorStage.FirstContact]: '1er contact',
  [VisitorStage.Invited]: 'Invité',
  [VisitorStage.InClass]: 'En cours',
  [VisitorStage.Adhered]: 'Adhésion'
};

export const VisitorStageColors: Record<VisitorStage, string> = {
  [VisitorStage.FirstContact]: 'secondary',
  [VisitorStage.Invited]: 'info',
  [VisitorStage.InClass]: 'warning',
  [VisitorStage.Adhered]: 'success'
};

export const VisitorStageOrder: Record<VisitorStage, number> = {
  [VisitorStage.FirstContact]: 1,
  [VisitorStage.Invited]: 2,
  [VisitorStage.InClass]: 3,
  [VisitorStage.Adhered]: 4
};

export const SpiritualStatusLabels: Record<SpiritualStatus, string> = {
  [SpiritualStatus.NonBeliever]: 'Non croyant',
  [SpiritualStatus.Catechumen]: 'Catéchumène',
  [SpiritualStatus.Believer]: 'Croyant',
  [SpiritualStatus.Baptized]: 'Baptisé',
  [SpiritualStatus.Disciple]: 'Disciple',
  [SpiritualStatus.Leader]: 'Leader'
};

export const MemberStatusColors: Record<MemberStatus, string> = {
  [MemberStatus.Visitor]: 'warning',
  [MemberStatus.Adherent]: 'info',
  [MemberStatus.Active]: 'success',
  [MemberStatus.Inactive]: 'secondary',
  [MemberStatus.ExMember]: 'danger'
};

export const SpiritualStatusColors: Record<SpiritualStatus, string> = {
  [SpiritualStatus.NonBeliever]: 'secondary',
  [SpiritualStatus.Catechumen]: 'info',
  [SpiritualStatus.Believer]: 'primary',
  [SpiritualStatus.Baptized]: 'success',
  [SpiritualStatus.Disciple]: 'warning',
  [SpiritualStatus.Leader]: 'danger'
};

export const AttachmentTypeLabels: Record<AttachmentType, string> = {
  [AttachmentType.JustificatifPhoto]: 'Photo justificative',
  [AttachmentType.CNI]: 'CNI / Pièce d\'identité',
  [AttachmentType.CertificatBapteme]: 'Certificat de baptême',
  [AttachmentType.Other]: 'Autre'
};

export const AttachmentTypeColors: Record<AttachmentType, string> = {
  [AttachmentType.JustificatifPhoto]: 'success',
  [AttachmentType.CNI]: 'primary',
  [AttachmentType.CertificatBapteme]: 'info',
  [AttachmentType.Other]: 'secondary'
};

// ✅ Classe utilitaire
export class MemberUtils {
  static getFullName(member: Member | MemberCreate): string {
    return `${member.firstName} ${member.lastName}`.trim();
  }

  static getInitials(member: Member | MemberCreate): string {
    const firstName = member.firstName?.charAt(0) || '';
    const lastName = member.lastName?.charAt(0) || '';
    return `${firstName}${lastName}`.toUpperCase();
  }

  static getAge(dateOfBirth?: string): number {
    if (!dateOfBirth) return 0;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  static getStatusLabel(status: MemberStatus): string {
    return MemberStatusLabels[status] || status;
  }

  static getStatusColor(status: MemberStatus): string {
    return MemberStatusColors[status] || 'secondary';
  }

  static getSpiritualStatusLabel(status: SpiritualStatus): string {
    return SpiritualStatusLabels[status] || status;
  }

  static getSpiritualStatusColor(status: SpiritualStatus): string {
    return SpiritualStatusColors[status] || 'secondary';
  }

  static getVisitorStageLabel(stage?: VisitorStage): string {
    if (!stage) return 'Non défini';
    return VisitorStageLabels[stage] || stage;
  }

  static getVisitorStageColor(stage?: VisitorStage): string {
    if (!stage) return 'secondary';
    return VisitorStageColors[stage] || 'secondary';
  }

  static getVisitorStageOrder(stage?: VisitorStage): number {
    if (!stage) return 0;
    return VisitorStageOrder[stage] || 0;
  }

  static getNextVisitorStage(currentStage?: VisitorStage): VisitorStage | null {
    if (!currentStage) return VisitorStage.FirstContact;
    const stages = Object.keys(VisitorStageOrder) as VisitorStage[];
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex === stages.length - 1) return null;
    return stages[currentIndex + 1];
  }

  static getPreviousVisitorStage(currentStage?: VisitorStage): VisitorStage | null {
    if (!currentStage) return null;
    const stages = Object.keys(VisitorStageOrder) as VisitorStage[];
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex <= 0) return null;
    return stages[currentIndex - 1];
  }

  static getAttachmentTypeLabel(type: AttachmentType): string {
    return AttachmentTypeLabels[type] || type;
  }

  static getAttachmentTypeColor(type: AttachmentType): string {
    return AttachmentTypeColors[type] || 'secondary';
  }

  static getActiveAttachments(attachments: MemberAttachment[]): MemberAttachment[] {
    return attachments.filter(a => a.isActive);
  }

  static getAttachmentsByType(attachments: MemberAttachment[], type: AttachmentType): MemberAttachment[] {
    return attachments.filter(a => a.type === type && a.isActive);
  }

  static getFormattedDate(date?: string): string {
    if (!date) return 'Non renseigné';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  static getFormattedDateTime(date?: string): string {
    if (!date) return 'Non renseigné';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getAgeGroup(age: number): string {
    if (age < 18) return '0-17';
    if (age < 30) return '18-29';
    if (age < 45) return '30-44';
    if (age < 60) return '45-59';
    return '60+';
  }

  static searchMembers(members: Member[], searchTerm: string): Member[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return members;
    return members.filter(member =>
      member.firstName.toLowerCase().includes(term) ||
      member.lastName.toLowerCase().includes(term) ||
      member.fullName.toLowerCase().includes(term) ||
      (member.email && member.email.toLowerCase().includes(term)) ||
      member.phone.includes(term)
    );
  }

  static getFullAddress(address?: Address): string {
    if (!address) return 'Adresse non renseignée';
    return address.fullAddress || address.formattedAddress ||
           `${address.city || ''} ${address.country || ''}`.trim() ||
           'Adresse non renseignée';
  }

  static getVisitorStatusSummary(member: Member): string {
    if (member.status !== MemberStatus.Visitor) {
      return `Membre ${this.getStatusLabel(member.status)}`;
    }
    if (member.visitorStage) {
      return `Visiteur - ${this.getVisitorStageLabel(member.visitorStage)}`;
    }
    return 'Visiteur';
  }

  static hasAttachments(member: Member): boolean {
    return member.attachments && member.attachments.some(a => a.isActive);
  }

  static countAttachmentsByType(member: Member): Record<AttachmentType, number> {
    const counts: Record<AttachmentType, number> = {
      [AttachmentType.JustificatifPhoto]: 0,
      [AttachmentType.CNI]: 0,
      [AttachmentType.CertificatBapteme]: 0,
      [AttachmentType.Other]: 0
    };
    if (!member.attachments) return counts;
    member.attachments.forEach(a => {
      if (a.isActive) {
        counts[a.type] = (counts[a.type] || 0) + 1;
      }
    });
    return counts;
  }

  static isSuccessResponse(response: any): boolean {
    return response?.isSuccess === true;
  }

  static getErrorMessage(response: any): string {
    return response?.errorMessage || 'Une erreur est survenue';
  }
}

export const DEFAULT_MEMBER_FILTER: MemberFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};
