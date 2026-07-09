// dashboard-home.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';

import { MemberStatus, OfferingType, OfferingStatus } from '../dashboard';
import { User } from '../../../../core/models/Users/user.model';
import { Auth } from '../../../../core/services/Auth/auth';
import { Token } from '../../../../core/services/Token/token';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterLink],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome implements OnInit, OnDestroy {
  userName: string = 'Utilisateur';
  currentUser: User | null = null;
  private subscriptions: Subscription = new Subscription();
  private isBrowser: boolean;

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

  recentMembers: any[] = [];
  recentOfferings: any[] = [];

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
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // ✅ Côté serveur : on ne fait rien
    if (!this.isBrowser) return;

    // Charger l'utilisateur connecté
    this.loadCurrentUser();

    // Charger les données du dashboard
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Charger l'utilisateur connecté
   */
  loadCurrentUser(): void {
    // Vérifier si un token existe
    const token = this.tokenService.getToken();
    if (!token) {
      console.warn('⚠️ Aucun token trouvé, utilisateur non connecté');
      this.userName = 'Invité';
      return;
    }

    this.subscriptions.add(
      this.authService.getCurrentUser().subscribe({
        next: (user: User) => {
          this.currentUser = user;
          this.userName = this.formatUserName(user);
          console.log('✅ Utilisateur chargé:', this.userName);
        },
        error: (error: any) => {
          console.error('❌ Erreur chargement utilisateur:', error);
          if (error.status === 401 || error.message?.includes('401')) {
            console.warn('🔐 Token invalide ou expiré');
            this.userName = 'Invité';
          } else {
            this.userName = 'Utilisateur';
          }
        }
      })
    );
  }

  /**
   * Formater le nom de l'utilisateur
   */
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

  /**
   * Charger les données du dashboard (données statiques pour l'instant)
   */
  loadDashboardData(): void {
    // Données statiques
    this.dashboardStats = {
      totalMembers: 247,
      newMembersThisMonth: 12,
      upcomingEvents: 4,
      totalEvents: 18,
      totalOfferings: 1850000,
      activeCells: 14,
      attendanceRate: 85,
      averageAttendance: 210,
      visitorsThisMonth: 28
    };

    // Membres récents
    this.recentMembers = [
      { fullName: 'Kouamé Marie-Claire', status: MemberStatus.Active, cellGroupName: 'Cocody' },
      { fullName: 'Konan Jean', status: MemberStatus.Active, cellGroupName: 'Plateau' },
      { fullName: 'Diallo Aïssatou', status: MemberStatus.Visitor, cellGroupName: '-' },
      { fullName: 'Brou Frédéric', status: MemberStatus.Active, cellGroupName: 'Cocody' },
      { fullName: 'N\'Guessan Thomas', status: MemberStatus.Active, cellGroupName: 'Marcory' }
    ];

    // Offrandes récentes
    this.recentOfferings = [
      { type: OfferingType.Tithe, amount: 250000, status: OfferingStatus.Validated },
      { type: OfferingType.SundayOffering, amount: 185000, status: OfferingStatus.Validated },
      { type: OfferingType.SpecialOffering, amount: 95000, status: OfferingStatus.Verified },
      { type: OfferingType.BuildingFund, amount: 50000, status: OfferingStatus.Pending },
      { type: OfferingType.Mission, amount: 35000, status: OfferingStatus.Validated }
    ];

    // Mettre à jour les graphiques
    this.updateCharts();
  }

  /**
   * Mettre à jour les données des graphiques
   */
  updateCharts(): void {
    // Graphique des statuts des membres
    this.chartData.membersByStatus.datasets[0].data = [28, 45, 160, 14];

    // Graphique des offrandes par type
    this.chartData.offeringsByType.datasets[0].data = [850000, 620000, 250000, 80000, 35000, 15000, 0];
  }

  // ──────────────────────────────────────────────
  // TRENDS (méthodes statiques)
  // ──────────────────────────────────────────────

  getMembersTrend(): number {
    return 8;
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
  // MÉTHODES MEMBRES (reprises du Dashboard)
  // ──────────────────────────────────────────────

  getMemberStatusText(status: MemberStatus): string {
    switch (status) {
      case MemberStatus.Visitor: return 'Visiteur';
      case MemberStatus.Adherent: return 'Adhérent';
      case MemberStatus.Active: return 'Actif';
      case MemberStatus.Inactive: return 'Inactif';
      case MemberStatus.ExMember: return 'Ancien';
      default: return 'Inconnu';
    }
  }

  getMemberStatusClass(status: MemberStatus): string {
    switch (status) {
      case MemberStatus.Visitor: return 'status-visitor';
      case MemberStatus.Adherent: return 'status-adherent';
      case MemberStatus.Active: return 'status-active';
      case MemberStatus.Inactive: return 'status-inactive';
      case MemberStatus.ExMember: return 'status-exmember';
      default: return 'status-unknown';
    }
  }

  // ──────────────────────────────────────────────
  // MÉTHODES OFFRANDES (reprises du Dashboard)
  // ──────────────────────────────────────────────

  getOfferingTypeText(type: OfferingType): string {
    switch (type) {
      case OfferingType.Tithe: return 'Dîme';
      case OfferingType.SundayOffering: return 'Offrande dominicale';
      case OfferingType.SpecialOffering: return 'Offrande spéciale';
      case OfferingType.BuildingFund: return 'Construction';
      case OfferingType.Mission: return 'Mission';
      case OfferingType.Seed: return 'Semence';
      case OfferingType.Thanksgiving: return 'Action de grâce';
      default: return 'Autre';
    }
  }

  getOfferingStatusText(status: OfferingStatus): string {
    switch (status) {
      case OfferingStatus.Pending: return 'En attente';
      case OfferingStatus.Verified: return 'Vérifié';
      case OfferingStatus.Validated: return 'Validé';
      case OfferingStatus.Cancelled: return 'Annulé';
      default: return 'Inconnu';
    }
  }

  getOfferingStatusClass(status: OfferingStatus): string {
    switch (status) {
      case OfferingStatus.Pending: return 'status-pending';
      case OfferingStatus.Verified: return 'status-verified';
      case OfferingStatus.Validated: return 'status-validated';
      case OfferingStatus.Cancelled: return 'status-cancelled';
      default: return 'status-unknown';
    }
  }

  // ──────────────────────────────────────────────
  // UTILITAIRES
  // ──────────────────────────────────────────────

  getFormattedNumber(value: number): string {
    return value.toLocaleString('fr-FR');
  }
}
