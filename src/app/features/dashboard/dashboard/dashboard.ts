import { Component, OnInit, OnDestroy, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterLink, Router } from '@angular/router';
import { catchError, forkJoin, map, Observable, of, Subscription } from 'rxjs';
import { Permissions } from '../../../core/services/Permissions/permissions';

import { User } from '../../../core/models/Users/user.model';
import { Token } from '../../../core/services/Token/token';

// Import de Chart.js pour les graphiques
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { SidebarComponent } from "../../../core/components/sidebar-component/sidebar-component";
import { environment } from '../../../../environments/environment';
import { Auth } from '../../../core/services/Auth/auth';

Chart.register(...registerables);

// Enums pour les statuts
export enum MemberStatus {
  Visitor = 0,
  Adherent = 1,
  Active = 2,
  Inactive = 3,
  ExMember = 4
}

export enum OfferingType {
  Tithe = 0,
  SundayOffering = 1,
  SpecialOffering = 2,
  BuildingFund = 3,
  Mission = 4,
  Seed = 5,
  Thanksgiving = 6,
  Other = 7
}

export enum OfferingStatus {
  Pending = 0,
  Verified = 1,
  Validated = 2,
  Cancelled = 3
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterLink, BaseChartDirective, SidebarComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit, OnDestroy {

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Données pour graphiques
  chartData: any = {
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

  currentUser: User | null = null;
  userName: string = 'Utilisateur';
  userPhotoUrl: string = '';
  showUserMenu: boolean = false;

  dashboardStats = {
    totalMembers: 0,
    newMembersThisMonth: 0,
    activeCells: 0,
    totalOfferings: 0,
    upcomingEvents: 0,
    totalEvents: 0,
    attendanceRate: 0,
    averageAttendance: 0,
    visitorsThisMonth: 0
  };

  // Données récentes
  recentMembers: any[] = [];
  recentOfferings: any[] = [];

  isLoading: boolean = true;
  isSidebarCollapsed: boolean = false;
  isMobileView: boolean = false;

  // Options des graphiques
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

  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: Auth,
    private tokenService: Token,
    private router: Router,
    public permission: Permissions
  ) { }

  ngOnInit(): void {
    // Vérifier que le token est bien présent
    const token = this.tokenService.getToken();

    if (!token) {
      console.error('❌ Pas de token - Redirection login');
      this.router.navigate(['/auth/login']);
      return;
    }

    this.checkMobileView();
    this.loadCurrentUser();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkMobileView();

    if (this.isMobileView) {
      this.isSidebarCollapsed = true;
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.add('collapsed');
    }
  }

  /**
   * Charger l'utilisateur connecté
   */
  loadCurrentUser(): void {
    this.subscriptions.add(
      this.authService.getCurrentUser().subscribe({
        next: (user: User) => {
          this.currentUser = user;
          this.userName = this.formatUserName(user);
          this.userPhotoUrl = this.getUserPhotoUrl(user);
        },
        error: (error: { message: string | string[]; }) => {
          console.error('❌ Erreur chargement utilisateur:', error);
          if (error.message?.includes('401')) {
            console.error('🔐 Token invalide - Déconnexion');
            this.tokenService.handleTokenExpired();
          } else {
            this.setDefaultUser();
          }
        }
      })
    );
  }

  private setDefaultUser(): void {
    this.userName = 'Utilisateur EKKLESIA';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
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
    return 'Utilisateur EKKLESIA';
  }

  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && user.photoUrl.length === 24) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }

    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return user.photoUrl;
    }

    return this.generateAvatarUrl(user);
  }

  generateAvatarUrl(user: User): string {
    const name = this.formatUserName(user);
    const colors = ['6C5CE7', '00B894', 'FDCB6E', 'E17055', '74B9FF', 'FF7675', '00CEC9', 'FFD166'];
    const colorIndex = name.length % colors.length;

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[colorIndex]}&color=fff&size=128`;
  }

  getUserInitials(): string {
    const name = this.userName;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  /**
   * Charger toutes les données du dashboard
   */
  loadDashboardData(): void {
    this.isLoading = true;

    // Simuler le chargement des données (à remplacer par de vrais appels API)
    setTimeout(() => {
      this.loadSimulatedData();
      this.isLoading = false;
    }, 800);
  }

  /**
   * Charger des données simulées (à remplacer par des appels API réels)
   */
  loadSimulatedData(): void {
    this.dashboardStats = {
      totalMembers: 247,
      newMembersThisMonth: 12,
      activeCells: 14,
      totalOfferings: 1850000,
      upcomingEvents: 4,
      totalEvents: 18,
      attendanceRate: 85,
      averageAttendance: 210,
      visitorsThisMonth: 28
    };

    // Membres récents simulés
    this.recentMembers = [
      { fullName: 'Kouamé Marie-Claire', status: MemberStatus.Active, cellGroupName: 'Cocody' },
      { fullName: 'Konan Jean', status: MemberStatus.Active, cellGroupName: 'Plateau' },
      { fullName: 'Diallo Aïssatou', status: MemberStatus.Visitor, cellGroupName: '-' },
      { fullName: 'Brou Frédéric', status: MemberStatus.Active, cellGroupName: 'Cocody' },
      { fullName: 'N\'Guessan Thomas', status: MemberStatus.Active, cellGroupName: 'Marcory' }
    ];

    // Offrandes récentes simulées
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
   * Mettre à jour les graphiques
   */
  updateCharts(): void {
    // Graphique des statuts des membres
    this.chartData.membersByStatus.datasets[0].data = [28, 45, 160, 14];

    // Graphique des offrandes par type
    this.chartData.offeringsByType.datasets[0].data = [850000, 620000, 250000, 80000, 35000, 15000, 0];
  }

  /**
   * Calculer la tendance des membres
   */
  getMembersTrend(): number {
    return 8;
  }

  /**
   * Calculer la tendance des offrandes
   */
  getOfferingsTrend(): number {
    return 12;
  }

  /**
   * Calculer la tendance des événements
   */
  getEventsTrend(): number {
    return 5;
  }

  /**
   * Calculer la tendance des présences
   */
  getAttendanceTrend(): number {
    return 3;
  }

  /**
   * Obtenir le texte du statut d'un membre
   */
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

  /**
   * Obtenir la classe CSS pour le statut d'un membre
   */
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

  /**
   * Obtenir le texte du type d'offrande
   */
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

  /**
   * Obtenir le texte du statut d'une offrande
   */
  getOfferingStatusText(status: OfferingStatus): string {
    switch (status) {
      case OfferingStatus.Pending: return 'En attente';
      case OfferingStatus.Verified: return 'Vérifié';
      case OfferingStatus.Validated: return 'Validé';
      case OfferingStatus.Cancelled: return 'Annulé';
      default: return 'Inconnu';
    }
  }

  /**
   * Obtenir la classe CSS pour le statut d'une offrande
   */
  getOfferingStatusClass(status: OfferingStatus): string {
    switch (status) {
      case OfferingStatus.Pending: return 'status-pending';
      case OfferingStatus.Verified: return 'status-verified';
      case OfferingStatus.Validated: return 'status-validated';
      case OfferingStatus.Cancelled: return 'status-cancelled';
      default: return 'status-unknown';
    }
  }

  /**
   * Formater un nombre avec séparateurs
   */
  getFormattedNumber(value: number): string {
    return value.toLocaleString('fr-FR');
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebar && mainContent) {
      if (this.isSidebarCollapsed) {
        sidebar.classList.add('collapsed');
        (mainContent as HTMLElement).style.marginLeft = '0';
      } else {
        sidebar.classList.remove('collapsed');
        if (!this.isMobileView) {
          (mainContent as HTMLElement).style.marginLeft = '272px';
        }
      }
    }
  }

  closeSidebar(): void {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.topbar-user') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  checkMobileView(): void {
    this.isMobileView = window.innerWidth <= 768;
    if (this.isMobileView) {
      this.isSidebarCollapsed = true;
    }
  }

  /**
   * Déconnexion
   */
  logout(): void {
    this.tokenService.logout();

    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (error: any) => {
        console.warn('⚠️ Erreur API déconnexion:', error);
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
