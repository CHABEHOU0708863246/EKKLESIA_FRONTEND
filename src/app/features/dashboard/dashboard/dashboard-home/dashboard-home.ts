// src/app/features/dashboard/dashboard-home/dashboard-home.component.ts

import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js';

import { Auth } from '../../../../core/services/Auth/auth';
import { Token } from '../../../../core/services/Token/token';
import { User } from '../../../../core/models/Users/user.model';
import { DashboardDto, RecentMemberDto, RecentOfferingDto } from '../../../../core/models/Dashboard/dashboard.model';
import { OfferingType, OfferingStatus } from '../../../../core/models/Finances/offering.model';
import { Dashboards } from '../../../../core/services/Dashboard/dashboards';

// Enregistrer tous les composants Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  private isBrowser: boolean;

  // Références aux graphiques
  private genderChart: Chart | null = null;
  private offeringsChart: Chart | null = null;
  private attendanceChart: Chart | null = null;

  // ─── Utilisateur ──────────────────────────────────────────────
  userName: string = 'Utilisateur';
  currentUser: User | null = null;

  // ─── Données du Dashboard ─────────────────────────────────────
  dashboardData: DashboardDto | null = null;
  loading = false;
  error: string | null = null;

  // ─── Indicateurs pour le template ─────────────────────────────
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

  // ─── Données des graphiques (fallback) ───────────────────────
  chartData = {
    genderLabels: [] as string[],
    genderData: [] as number[],
    offeringLabels: [] as string[],
    offeringData: [] as number[],
    attendanceLabels: [] as string[],
    attendanceData: [] as number[],
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

  ngAfterViewInit(): void {
    // Les graphiques seront créés après le chargement des données
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DE L'UTILISATEUR
  // ──────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES DU DASHBOARD (API)
  // ──────────────────────────────────────────────────────────────

  loadDashboardData(): void {
    this.loading = true;
    this.error = null;

    // Récupérer toutes les données en parallèle (dashboard complet, KPI, charts)
    forkJoin({
      dashboard: this.dashboardService.getDashboardData(),
      kpi: this.dashboardService.getKpiData(),
      charts: this.dashboardService.getChartData()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ dashboard, kpi, charts }) => {
          this.loading = false;

          // 1. Dashboard principal
          if (dashboard.success && dashboard.data) {
            this.dashboardData = dashboard.data;
            this.mapDashboardData(dashboard.data);
          } else {
            this.error = dashboard.message || 'Erreur chargement du tableau de bord.';
          }

          // 2. KPI (si nécessaire pour compléter)
          if (kpi.success && kpi.data) {
            // On peut utiliser certaines valeurs du KPI si elles ne sont pas dans le DTO principal
            // Exemple : mettre à jour le taux de présence
            if (kpi.data.averageAttendanceRate !== undefined) {
              this.dashboardStats.attendanceRate = Math.round(kpi.data.averageAttendanceRate);
              this.dashboardStats.averageAttendance = Math.round(kpi.data.averageAttendanceRate);
            }
          }

          // 3. Charts (si le DTO principal ne les contient pas)
          if (charts.success && charts.data) {
            // On peut mettre à jour les données des graphiques avec les données spécifiques
            // Mais normalement elles sont déjà dans dashboard.data
            // On peut les utiliser comme fallback
            if (charts.data.genderDistribution) {
              this.chartData.genderLabels = charts.data.genderDistribution.items?.map(i => i.label) || [];
              this.chartData.genderData = charts.data.genderDistribution.items?.map(i => i.count) || [];
            }
            if (charts.data.offeringsByType) {
              this.chartData.offeringLabels = charts.data.offeringsByType.items?.map(i => i.label) || [];
              this.chartData.offeringData = charts.data.offeringsByType.items?.map(i => i.amount) || [];
            }
            if (charts.data.attendanceTrend) {
              this.chartData.attendanceLabels = charts.data.attendanceTrend.points?.map(p => p.date) || [];
              this.chartData.attendanceData = charts.data.attendanceTrend.points?.map(p => p.attendance) || [];
            }
          }

          // Créer les graphiques après que le DOM soit prêt
          setTimeout(() => this.createCharts(), 200);
        },
        error: (err) => {
          console.error('❌ Erreur chargement dashboard:', err);
          this.loading = false;
          this.error = 'Erreur lors du chargement du tableau de bord.';
        }
      });
  }

  // ──────────────────────────────────────────────────────────────
  // MAPPAGE DES DONNÉES DU DTO Dashboard
  // ──────────────────────────────────────────────────────────────

  private mapDashboardData(data: DashboardDto): void {
    // Indicateurs principaux
    this.dashboardStats.totalMembers = data.totalMembers ?? 0;
    this.dashboardStats.activeCells = data.totalCells ?? 0;
    this.dashboardStats.upcomingEvents = data.upcomingEvents ?? 0;
    this.dashboardStats.totalEvents = data.upcomingEvents ?? 0; // ou totalEvents si disponible
    this.dashboardStats.totalOfferings = data.monthlyCollection ?? 0;
    this.dashboardStats.attendanceRate = Math.round(data.averageAttendanceRate ?? 0);
    this.dashboardStats.averageAttendance = Math.round(data.averageAttendanceRate ?? 0);

    // Nouveaux membres ce mois-ci (à partir de recentMembers)
    const now = new Date();
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newMembers = data.recentMembers?.filter(m =>
      new Date(m.createdAt) >= firstDayMonth
    ) || [];
    this.dashboardStats.newMembersThisMonth = newMembers.length;
    this.dashboardStats.visitorsThisMonth = 0; // Si non disponible

    // Listes récentes
    this.recentMembers = data.recentMembers?.slice(0, 5) || [];
    this.recentOfferings = data.recentOfferings?.slice(0, 5) || [];

    // Données pour les graphiques
    // Répartition par genre
    if (data.genderDistribution?.items) {
      this.chartData.genderLabels = data.genderDistribution.items.map(item => item.label);
      this.chartData.genderData = data.genderDistribution.items.map(item => item.count);
    } else {
      this.chartData.genderLabels = ['Hommes', 'Femmes', 'Autre', 'Non renseigné'];
      this.chartData.genderData = [0, 0, 0, 0];
    }

    // Offrandes par type
    if (data.offeringsByType?.items) {
      this.chartData.offeringLabels = data.offeringsByType.items.map(item => item.label);
      this.chartData.offeringData = data.offeringsByType.items.map(item => item.amount);
    } else {
      this.chartData.offeringLabels = ['Aucune donnée'];
      this.chartData.offeringData = [1];
    }

    // Tendance des présences
    if (data.attendanceTrend?.points) {
      this.chartData.attendanceLabels = data.attendanceTrend.points.map(p => p.date);
      this.chartData.attendanceData = data.attendanceTrend.points.map(p => p.attendance);
    } else {
      this.chartData.attendanceLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
      this.chartData.attendanceData = [0, 0, 0, 0, 0, 0];
    }
  }

  // ──────────────────────────────────────────────────────────────
  // CRÉATION DES GRAPHIQUES (Chart.js)
  // ──────────────────────────────────────────────────────────────

  private createCharts(): void {
    if (!this.isBrowser) return;
    this.destroyCharts();

    // 1. Répartition des membres (pie)
    this.createGenderChart();

    // 2. Offrandes par type (doughnut)
    this.createOfferingsChart();

    // 3. Évolution des présences (line)
    this.createAttendanceChart();
  }

  private createGenderChart(): void {
    const canvas = document.getElementById('genderChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.genderChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.chartData.genderLabels,
        datasets: [{
          data: this.chartData.genderData,
          backgroundColor: ['#6C5CE7', '#00B894', '#FDCB6E', '#E17055', '#74B9FF'],
          hoverBackgroundColor: ['#8B7EE8', '#55EFC4', '#FDE68A', '#F8A4A4', '#A8D8FF'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: { size: 12 }
            }
          }
        }
      }
    });
  }

  private createOfferingsChart(): void {
    const canvas = document.getElementById('offeringsChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#6C5CE7', '#00B894', '#FDCB6E', '#E17055', '#74B9FF', '#00CEC9', '#FF7675'];

    this.offeringsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.chartData.offeringLabels,
        datasets: [{
          data: this.chartData.offeringData,
          backgroundColor: colors.slice(0, this.chartData.offeringData.length),
          hoverBackgroundColor: colors.slice(0, this.chartData.offeringData.length).map(c => c + 'CC'),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: { size: 12 }
            }
          }
        }
      }
    });
  }

  private createAttendanceChart(): void {
    const canvas = document.getElementById('attendanceChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.attendanceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.chartData.attendanceLabels,
        datasets: [{
          label: 'Participants',
          data: this.chartData.attendanceData,
          borderColor: '#6C5CE7',
          backgroundColor: 'rgba(108, 92, 231, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#6C5CE7',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  private destroyCharts(): void {
    if (this.genderChart) {
      this.genderChart.destroy();
      this.genderChart = null;
    }
    if (this.offeringsChart) {
      this.offeringsChart.destroy();
      this.offeringsChart = null;
    }
    if (this.attendanceChart) {
      this.attendanceChart.destroy();
      this.attendanceChart = null;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // MÉTHODES D'AFFICHAGE (statuts, labels, etc.)
  // ──────────────────────────────────────────────────────────────

  // --- Membres ---
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

  // --- Offrandes ---
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
    return map[type] || 'Inconnu';
  }

  getOfferingStatusText(status: OfferingStatus): string {
    const map: Record<OfferingStatus, string> = {
      [OfferingStatus.Pending]: 'En attente',
      [OfferingStatus.Verified]: 'Vérifié',
      [OfferingStatus.Validated]: 'Validé',
      [OfferingStatus.Cancelled]: 'Annulé'
    };
    return map[status] || 'Inconnu';
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

  // --- Tendances (valeurs statiques pour l'instant) ---
  getMembersTrend(): number { return 8; }
  getOfferingsTrend(): number { return 12; }
  getEventsTrend(): number { return 5; }
  getAttendanceTrend(): number { return 3; }

  // --- Formatage ---
  getFormattedNumber(value: number): string {
    return value.toLocaleString('fr-FR');
  }
}
