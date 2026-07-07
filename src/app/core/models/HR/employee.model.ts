
export enum EmploymentType {
  FullTime = 'FullTime',
  PartTime = 'PartTime',
  Contract = 'Contract',
  Internship = 'Internship',
  Volunteer = 'Volunteer'
}

export interface EmployeeDocument {
  name: string;
  type: string;
  url: string;
  uploadDate: string;
  formattedUploadDate: string;
}

export interface Employee {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  employeeCode: string;
  position: string;
  department?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  employmentType: EmploymentType;
  employmentTypeLabel: string;
  salary: number;
  currency: string;
  bankName?: string;
  bankAccount?: string;
  taxIdentifier?: string;
  socialSecurity?: string;
  vacationDays: number;
  vacationTaken: number;
  vacationRemaining: number;
  contractType?: string;
  contractUrl?: string;
  documents: EmployeeDocument[];
  churchId: string;
  churchName?: string;
  siteId?: string;
  siteName?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  formattedStartDate: string;
  formattedEndDate?: string;
  formattedSalary: string;
  employmentDuration: number;
}

export interface EmployeeCreate {
  userId: string;
  employeeCode: string;
  position: string;
  department?: string;
  startDate: string;
  endDate?: string;
  isActive?: boolean;
  employmentType: EmploymentType;
  salary: number;
  currency?: string;
  bankName?: string;
  bankAccount?: string;
  taxIdentifier?: string;
  socialSecurity?: string;
  vacationDays?: number;
  vacationTaken?: number;
  contractType?: string;
  contractUrl?: string;
  documents?: EmployeeDocument[];
  churchId: string;
  siteId?: string;
}

export interface EmployeeUpdate {
  position?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  employmentType?: EmploymentType;
  salary?: number;
  currency?: string;
  bankName?: string;
  bankAccount?: string;
  taxIdentifier?: string;
  socialSecurity?: string;
  vacationDays?: number;
  vacationTaken?: number;
  contractType?: string;
  contractUrl?: string;
  documents?: EmployeeDocument[];
  siteId?: string;
}

export interface EmployeeFilter {
  employeeCode?: string;
  position?: string;
  department?: string;
  isActive?: boolean;
  employmentType?: EmploymentType;
  userId?: string;
  churchId?: string;
  siteId?: string;
  minSalary?: number;
  maxSalary?: number;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  minVacationRemaining?: number;
  maxVacationRemaining?: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface EmployeeListResponse {
  items: Employee[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface EmployeeSummary {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  employeesByType: Record<EmploymentType, number>;
  employeesByDepartment: Record<string, number>;
  totalPayroll: number;
  averageSalary: number;
  minSalary: number;
  maxSalary: number;
  totalVacationDays: number;
  totalVacationTaken: number;
  totalVacationRemaining: number;
  recentEmployees: Employee[];
  employeesWithLowVacation: Employee[];
}

// Labels pour les types d'emploi
export const EmploymentTypeLabels: Record<EmploymentType, string> = {
  [EmploymentType.FullTime]: 'Temps plein',
  [EmploymentType.PartTime]: 'Temps partiel',
  [EmploymentType.Contract]: 'Contrat',
  [EmploymentType.Internship]: 'Stage',
  [EmploymentType.Volunteer]: 'Bénévole'
};

export const EmploymentTypeColors: Record<EmploymentType, string> = {
  [EmploymentType.FullTime]: 'primary',
  [EmploymentType.PartTime]: 'info',
  [EmploymentType.Contract]: 'warning',
  [EmploymentType.Internship]: 'secondary',
  [EmploymentType.Volunteer]: 'success'
};

// Classe utilitaire
export class EmployeeUtils {
  static getEmploymentTypeLabel(type: EmploymentType): string {
    return EmploymentTypeLabels[type] || type;
  }

  static getEmploymentTypeColor(type: EmploymentType): string {
    return EmploymentTypeColors[type] || 'secondary';
  }

  static getStatusBadge(isActive: boolean): { label: string; color: string } {
    return isActive
      ? { label: 'Actif', color: 'success' }
      : { label: 'Inactif', color: 'danger' };
  }

  static getFormattedDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  static getFormattedCurrency(amount: number, currency: string): string {
    return `${amount.toLocaleString()} ${currency}`;
  }

  static getVacationStatus(vacationRemaining: number): { label: string; color: string } {
    if (vacationRemaining <= 0) {
      return { label: 'Aucun congé', color: 'danger' };
    }
    if (vacationRemaining <= 5) {
      return { label: 'Faible', color: 'warning' };
    }
    if (vacationRemaining <= 15) {
      return { label: 'Moyen', color: 'info' };
    }
    return { label: 'Élevé', color: 'success' };
  }

  static searchEmployees(employees: Employee[], searchTerm: string): Employee[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return employees;

    return employees.filter(emp =>
      emp.userFullName.toLowerCase().includes(term) ||
      emp.employeeCode.toLowerCase().includes(term) ||
      emp.position.toLowerCase().includes(term) ||
      (emp.department && emp.department.toLowerCase().includes(term)) ||
      emp.userEmail.toLowerCase().includes(term)
    );
  }

  static filterByDepartment(employees: Employee[], department: string): Employee[] {
    if (!department) return employees;
    return employees.filter(emp => emp.department === department);
  }

  static sortBySalary(employees: Employee[], ascending: boolean = true): Employee[] {
    return [...employees].sort((a, b) =>
      ascending ? a.salary - b.salary : b.salary - a.salary
    );
  }
}

export const DEFAULT_EMPLOYEE_FILTER: EmployeeFilter = {
  page: 1,
  pageSize: 20,
  sortBy: 'startDate',
  sortOrder: 'desc'
};
