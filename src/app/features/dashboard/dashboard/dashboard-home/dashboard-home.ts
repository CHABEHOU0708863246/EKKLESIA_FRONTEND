// src/app/features/dashboard/dashboard-home/dashboard-home.component.ts

import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Auth } from '../../../../core/services/Auth/auth';
import { Token } from '../../../../core/services/Token/token';
import { User } from '../../../../core/models/Users/user.model';
import { DashboardDto, DashboardUtils } from '../../../../core/models/Dashboard/dashboard.model';
import { OfferingType, OfferingStatus } from '../../../../core/models/Finances/offering.model';
import { MemberStatus } from '../../../../core/models/Members/member.model';
import { RecentMemberDto, RecentOfferingDto } from '../../../../core/models/Dashboard/dashboard.model';
import { Dashboards } from '../../../../core/services/Dashboard/dashboards';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private isBrowser: boolean;

  // ── Utilisateur ──
  userName: string = 'Utilisateur';
  currentUser: User | null = null;

  // ── Données du Dashboard ──
  dashboardData: DashboardDto | null = null;
  loading = false;
  error: string | null = null;

  // ── Propriétés pour le template (mappées depuis dashboardData) ──
  dashboardStats = {
    totalMembers: 0,
    newMembersThisMonth: 0,
    upcomingEvents: 0,
    totalEvents: 0,
    totalOfferings: 0,
    activeCells: 0,
    attendanceRate: 0,
    averageAttendance: 0,
    visitorsThisMonth: 0,
  };

  recentMembers: RecentMemberDto[] = [];
  recentOfferings: RecentOfferingDto[] = [];

  // ── Données pour les graphiques (à utiliser avec Chart.js ou autre) ──
  chartData = {
    membersByStatus: {
      labels: ['Visiteurs', 'Adhérents', 'Actifs', 'Inactifs'],
      datasets: [{
        data: [0, 0, 0, 0],
        backgroundColor: ['#FFD166', '#74B9FF', '#00B894', '#E17055'],
        hoverBackgroundColor: ['#FFE08A', '#9DC6FF', '#55EFC4', '#F8A4A4']
      }]
    },
    offeringsByType: {
      labels: ['Dîmes', 'Offrandes', 'Spéciales', 'Construction', 'Mission', 'Semence', 'Action de grâce'],
      datasets: [{
        data: [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: ['#6C5CE7', '#00B894', '#FDCB6E', '#E17055', '#74B9FF', '#00CEC9', '#FF7675'],
        hoverBackgroundColor: ['#8B7EE8', '#55EFC4', '#FDE68A', '#F8A4A4', '#A8D8FF', '#81ECEC', '#FFA4A4']
      }]
    },
    attendanceTrend: {
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
      datasets: [
        {
          label: 'Membres',
          data: [120, 135, 142, 158, 165, 180],
          borderColor: '#6C5CE7',
          backgroundColor: 'rgba(108, 92, 231, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Visiteurs',
          data: [15, 18, 12, 20, 25, 22],
          borderColor: '#FDCB6E',
          backgroundColor: 'rgba(253, 203, 110, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    }
  };

  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
        }
      }
    }
  };

  lineChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  constructor(
    private authService: Auth,
    private tokenService: Token,
    private dashboardService: Dashboards,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.loadCurrentUser();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────
  // CHARGEMENT DE L'UTILISATEUR
  // ──────────────────────────────────────────────

  loadCurrentUser(): void {
    const token = this.tokenService.getToken();
    if (!token) {
      this.userName = 'Invité';
      return;
    }

    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          this.currentUser = user;
          this.userName = this.formatUserName(user);
        },
        error: () => {
          this.userName = 'Utilisateur';
        }
      });
  }

  formatUserName(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.username) {
      return user.username;
    } else if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Utilisateur';
  }

  // ──────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES DU DASHBOARD
  // ──────────────────────────────────────────────

  loadDashboardData(): void {
    this.loading = true;
    this.error = null;

    this.dashboardService.getDashboardData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; data: DashboardDto | null; message: string; }) => {
          this.loading = false;
          if (response.success && response.data) {
            this.dashboardData = response.data;
            this.mapDashboardData(response.data);
            this.updateChartsFromData(response.data);
          } else {
            this.error = response.message || 'Impossible de charger le tableau de bord.';
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur chargement dashboard:', err);
          this.loading = false;
          this.error = 'Erreur lors du chargement du tableau de bord.';
        }
      });
  }

  // ──────────────────────────────────────────────
  // MAPPAGE DES DONNÉES VERS LE TEMPLATE
  // ──────────────────────────────────────────────

  private mapDashboardData(data: DashboardDto): void {
    // Indicateurs principaux
    this.dashboardStats.totalMembers = data.totalMembers ?? 0;
    this.dashboardStats.activeCells = data.totalCells ?? 0;
    this.dashboardStats.upcomingEvents = data.upcomingEvents ?? 0;
    this.dashboardStats.totalEvents = data.upcomingEvents ?? 0; // On réutilise
    this.dashboardStats.totalOfferings = data.monthlyCollection ?? 0;
    this.dashboardStats.attendanceRate = Math.round(data.averageAttendanceRate ?? 0);
    this.dashboardStats.averageAttendance = Math.round(data.averageAttendanceRate ?? 0);

    // Nouveaux membres du mois (on peut les calculer à partir des membres récents)
    const now = new Date();
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newMembers = data.recentMembers?.filter(m =>
      new Date(m.createdAt) >= firstDayMonth
    ) || [];
    this.dashboardStats.newMembersThisMonth = newMembers.length;

    // Visiteurs du mois (approximation basée sur les visiteurs récents)
    this.dashboardStats.visitorsThisMonth = 0; // À compléter si backend fournit les données

    // Listes récentes
    this.recentMembers = data.recentMembers?.slice(0, 5) || [];
    this.recentOfferings = data.recentOfferings?.slice(0, 5) || [];
  }

  // ──────────────────────────────────────────────
  // MISE À JOUR DES GRAPHIQUES
  // ──────────────────────────────────────────────

  private updateChartsFromData(data: DashboardDto): void {
    // Répartition par statut (on simule avec des données)
    // Idéalement, on aurait un endpoint pour les statuts, on garde les données statiques pour l'instant.
    // On peut les remplacer par des données réelles si disponibles.
    if (data.genderDistribution?.items) {
      // On pourrait mapper les genres, mais on garde les statuts pour l'exemple.
    }

    // Offrandes par type
    if (data.offeringsByType?.items) {
      const labels: string[] = [];
      const values: number[] = [];
      data.offeringsByType.items.forEach(item => {
        labels.push(item.label);
        values.push(item.amount);
      });
      this.chartData.offeringsByType.labels = labels;
      this.chartData.offeringsByType.datasets[0].data = values;
    }

    // Tendance des présences
    if (data.attendanceTrend?.points) {
      const labels = data.attendanceTrend.points.map(p => p.date);
      const values = data.attendanceTrend.points.map(p => p.attendance);
      this.chartData.attendanceTrend.labels = labels;
      this.chartData.attendanceTrend.datasets[0].data = values;
    }
  }

  // ──────────────────────────────────────────────
  // TRENDS (valeurs calculées ou statiques)
  // ──────────────────────────────────────────────

  getMembersTrend(): number {
    // On pourrait calculer la tendance à partir des données si disponibles
    return 8; // valeur statique pour l'exemple
  }

  getOfferingsTrend(): number {
    return 12;
  }

  getEventsTrend(): number {
    return 5;
  }

  getAttendanceTrend(): number {
    return 3;
  }

  // ──────────────────────────────────────────────
  // MÉTHODES MEMBRES
  // ──────────────────────────────────────────────

  getMemberStatusText(status: string): string {
    const map: Record<string, string> = {
      'Visitor': 'Visiteur',
      'Adherent': 'Adhérent',
      'Active': 'Actif',
      'Inactive': 'Inactif',
      'ExMember': 'Ancien'
    };
    return map[status] || status;
  }

  getMemberStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Visitor': 'status-visitor',
      'Adherent': 'status-adherent',
      'Active': 'status-active',
      'Inactive': 'status-inactive',
      'ExMember': 'status-exmember'
    };
    return map[status] || 'status-unknown';
  }

  // ──────────────────────────────────────────────
  // MÉTHODES OFFRANDES
  // ──────────────────────────────────────────────

  getOfferingTypeText(type: OfferingType): string {
    const map: Record<OfferingType, string> = {
      [OfferingType.Tithe]: 'Dîme',
      [OfferingType.SundayOffering]: 'Offrande dominicale',
      [OfferingType.SpecialOffering]: 'Offrande spéciale',
      [OfferingType.BuildingFund]: 'Construction',
      [OfferingType.Mission]: 'Mission',
      [OfferingType.Seed]: 'Semence',
      [OfferingType.Thanksgiving]: 'Action de grâce',
      [OfferingType.Other]: 'Autre'
    };
    return map[type] || type;
  }

  getOfferingStatusText(status: OfferingStatus): string {
    const map: Record<OfferingStatus, string> = {
      [OfferingStatus.Pending]: 'En attente',
      [OfferingStatus.Verified]: 'Vérifié',
      [OfferingStatus.Validated]: 'Validé',
      [OfferingStatus.Cancelled]: 'Annulé'
    };
    return map[status] || status;
  }

  getOfferingStatusClass(status: OfferingStatus): string {
    const map: Record<OfferingStatus, string> = {
      [OfferingStatus.Pending]: 'status-pending',
      [OfferingStatus.Verified]: 'status-verified',
      [OfferingStatus.Validated]: 'status-validated',
      [OfferingStatus.Cancelled]: 'status-cancelled'
    };
    return map[status] || 'status-unknown';
  }

  // ──────────────────────────────────────────────
  // UTILITAIRES
  // ──────────────────────────────────────────────

  getFormattedNumber(value: number): string {
    return value.toLocaleString('fr-FR');
  }
}
