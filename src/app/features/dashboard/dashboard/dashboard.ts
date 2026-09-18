// dashboard.ts

import { FormsModule } from '@angular/forms';
import { RouterModule, RouterLink, Router } from '@angular/router';
import { catchError, forkJoin, map, Observable, of, Subscription } from 'rxjs';
import { Permissions } from '../../../core/services/Permissions/permissions';

import { Component, OnInit, OnDestroy, HostListener, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { User } from '../../../core/models/Users/user.model';
import { Token } from '../../../core/services/Token/token';

// Import de Chart.js pour les graphiques
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { SidebarComponent } from "../../../core/components/sidebar-component/sidebar-component";
import { AgentWidget } from "../../../core/components/agent-widget/agent-widget";
import { NotificationComponent } from "../../../core/components/notification-component/notification-component";
import { environment } from '../../../../environments/environment';
import { Auth } from '../../../core/services/Auth/auth';
import { DashboardDto, DashboardKpiDto, DashboardChartsDto } from '../../../core/models/Dashboard/dashboard.model';
import { Dashboards } from '../../../core/services/Dashboard/dashboards';
import { AppNotifications } from '../../../core/services/Notifications/notifications-app';
import { AppNotification } from '../../../core/models/Notifications/app-notification.model';



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
  imports: [CommonModule, FormsModule, RouterModule, RouterLink, SidebarComponent, AgentWidget, NotificationComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit, OnDestroy {

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  @ViewChild(SidebarComponent) sidebarComponent!: SidebarComponent;

  // ─── Données du tableau de bord ──────────────────────────────
  dashboardData: DashboardDto | null = null;
  kpiData: DashboardKpiDto | null = null;
  chartData: DashboardChartsDto | null = null;

  // ─── Indicateurs affichés ─────────────────────────────────────
  totalMembers: number = 0;
  activeMembers: number = 0;
  totalCells: number = 0;
  upcomingEvents: number = 0;
  monthlyCollection: number = 0;
  averageAttendanceRate: number = 0;

  // ─── Listes récentes ──────────────────────────────────────────
  recentMembers: any[] = [];
  recentOfferings: any[] = [];

  // ─── Données graphiques (Chart.js) ───────────────────────────
  genderChartData: any = { labels: [], datasets: [] };
  offeringTypeChartData: any = { labels: [], datasets: [] };
  attendanceChartData: any = { labels: [], datasets: [] };

  // ─── Utilisateur ──────────────────────────────────────────────
  currentUser: User | null = null;
  userName: string = 'Utilisateur';
  userPhotoUrl: string = '';
  showUserMenu: boolean = false;

  isLoading: boolean = true;
  errorMessage: string | null = null;

  // ─── Options des graphiques ──────────────────────────────────
  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } }
    }
  };

  lineChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { grid: { display: false } }
    }
  };

  private isBrowser: boolean;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: Auth,
    private tokenService: Token,
    private router: Router,
    public permission: Permissions,
    private dashboardApi: Dashboards,
    private notificationsApi: AppNotifications,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loadCurrentUser();
    this.loadDashboardData();
    this.startNotificationsPolling();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.notificationsTimer) {
      clearInterval(this.notificationsTimer);
      this.notificationsTimer = null;
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 🔔 NOTIFICATIONS (cloche du topbar)
  // ──────────────────────────────────────────────────────────────────

  unreadNotifications = 0;
  notificationsOpen = false;
  notificationsLoading = false;
  recentNotifications: AppNotification[] = [];
  private notificationsTimer: ReturnType<typeof setInterval> | null = null;

  /** Sondage léger du compteur (60 s) : une seule requête count. */
  private startNotificationsPolling(): void {
    if (!this.permission.canViewNotifications()) return;

    this.loadUnreadNotifications();
    this.notificationsTimer = setInterval(() => this.loadUnreadNotifications(), 60_000);
  }

  loadUnreadNotifications(): void {
    this.subscriptions.add(
      this.notificationsApi.getUnreadCount().subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.unreadNotifications = response.data.unread ?? 0;
          }
        },
        error: () => { /* silencieux : la cloche ne doit jamais gêner la navigation */ }
      })
    );
  }

  toggleNotifications(event?: Event): void {
    event?.stopPropagation();
    this.notificationsOpen = !this.notificationsOpen;

    if (this.notificationsOpen) {
      this.notificationsLoading = true;
      this.subscriptions.add(
        this.notificationsApi.getMine(false, 1, 8).subscribe({
          next: (response) => {
            this.notificationsLoading = false;
            if (response.success && response.data) {
              this.recentNotifications = response.data.items ?? [];
              this.unreadNotifications = response.data.unreadCount ?? this.unreadNotifications;
            }
          },
          error: () => (this.notificationsLoading = false)
        })
      );
    }
  }

  /** Ouvre une notification : marque lue puis suit son lien interne. */
  openNotification(notification: AppNotification, event?: Event): void {
    event?.stopPropagation();
    this.notificationsOpen = false;

    if (!notification.isRead) {
      this.subscriptions.add(
        this.notificationsApi.markRead(notification.id).subscribe({
          next: () => {
            notification.isRead = true;
            this.unreadNotifications = Math.max(0, this.unreadNotifications - 1);
          }
        })
      );
    }

    if (notification.link) {
      this.router.navigateByUrl(notification.link);
    }
  }

  markAllNotificationsRead(event?: Event): void {
    event?.stopPropagation();
    this.subscriptions.add(
      this.notificationsApi.markAllRead().subscribe({
        next: (response) => {
          if (response.success) {
            this.unreadNotifications = 0;
            this.recentNotifications = this.recentNotifications.map((n) => ({ ...n, isRead: true }));
          }
        }
      })
    );
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'Success': return 'bx-check-circle';
      case 'Warning': return 'bx-error';
      case 'Error': return 'bx-x-circle';
      case 'Reminder': return 'bx-time-five';
      case 'Alert': return 'bx-bell';
      default: return 'bx-info-circle';
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'Success': return '#00B894';
      case 'Warning': return '#FDCB6E';
      case 'Error': return '#E17055';
      case 'Reminder': return '#0984E3';
      case 'Alert': return '#E17055';
      default: return '#6C5CE7';
    }
  }

  formatNotificationDate(value: string): string {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // ──────────────────────────────────────────────────────────────────
  // 🔐 UTILISATEUR
  // ──────────────────────────────────────────────────────────────────

  loadCurrentUser(): void {
    this.subscriptions.add(
      this.authService.getCurrentUser().subscribe({
        next: (user: User) => {
          this.currentUser = user;
          this.userName = this.formatUserName(user);
          this.userPhotoUrl = this.getUserPhotoUrl(user);
        },
        error: () => {
          this.setDefaultUser();
        }
      })
    );
  }

  private setDefaultUser(): void {
    this.userName = 'Utilisateur EKKLESIA';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

  formatUserName(user: User): string {
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.username) return user.username;
    if (user.email) return user.email.split('@')[0];
    return 'Utilisateur EKKLESIA';
  }

  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && user.photoUrl.length === 24) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }
    if (user.photoUrl?.startsWith('http')) return user.photoUrl;
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
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    return name.charAt(0).toUpperCase();
  }

  // ──────────────────────────────────────────────────────────────────
  // 📊 CHARGEMENT DES DONNÉES DU TABLEAU DE BORD
  // ──────────────────────────────────────────────────────────────────

  loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Récupérer toutes les données en parallèle
    this.subscriptions.add(
      forkJoin({
        dashboard: this.dashboardApi.getDashboardData(),
        kpi: this.dashboardApi.getKpiData(),
        charts: this.dashboardApi.getChartData()
      }).subscribe({
        next: ({ dashboard, kpi, charts }) => {
          if (dashboard.success && dashboard.data) {
            this.dashboardData = dashboard.data;
            this.extractDashboardData(dashboard.data);
          } else {
            this.errorMessage = dashboard.message || 'Erreur chargement du tableau de bord';
          }

          if (kpi.success && kpi.data) {
            this.kpiData = kpi.data;
            this.extractKpiData(kpi.data);
          }

          if (charts.success && charts.data) {
            this.chartData = charts.data;
            this.updateChartsFromApi(charts.data);
          }

          this.isLoading = false;
        },
        error: (err) => {
          console.error('❌ Erreur API Dashboard:', err);
          this.errorMessage = 'Impossible de charger les données. Veuillez réessayer.';
          this.isLoading = false;
        }
      })
    );
  }

  // ─── Extraction des données du DTO Dashboard ──────────────────────

  private extractDashboardData(data: DashboardDto): void {
    this.totalMembers = data.totalMembers || 0;
    this.activeMembers = data.activeMembers || 0;
    this.totalCells = data.totalCells || 0;
    this.upcomingEvents = data.upcomingEvents || 0;
    this.monthlyCollection = data.monthlyCollection || 0;
    this.averageAttendanceRate = data.averageAttendanceRate || 0;
    this.recentMembers = data.recentMembers || [];
    this.recentOfferings = data.recentOfferings || [];
  }

  private extractKpiData(data: DashboardKpiDto): void {
    // On peut mettre à jour des indicateurs supplémentaires si nécessaire
    // Par exemple, le taux de présence, etc.
    if (data.averageAttendanceRate !== undefined) {
      this.averageAttendanceRate = data.averageAttendanceRate;
    }
  }

  // ─── Mise à jour des graphiques à partir des données API ────────

  private updateChartsFromApi(charts: DashboardChartsDto): void {
    // Graphique répartition des membres par genre
    if (charts.genderDistribution) {
      const items = charts.genderDistribution.items || [];
      const labels = items.map((i: { label: any; }) => i.label);
      const counts = items.map((i: { count: any; }) => i.count);

      this.genderChartData = {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: ['#FFD166', '#74B9FF', '#00B894', '#E17055'],
          hoverBackgroundColor: ['#FFE08A', '#9DC6FF', '#55EFC4', '#F8A4A4']
        }]
      };
    }

    // Graphique offrandes par type
    if (charts.offeringsByType) {
      const items = charts.offeringsByType.items || [];
      const labels = items.map((i: { label: any; }) => i.label);
      const amounts = items.map((i: { amount: any; }) => i.amount);

      this.offeringTypeChartData = {
        labels: labels,
        datasets: [{
          data: amounts,
          backgroundColor: ['#6C5CE7', '#00B894', '#FDCB6E', '#E17055', '#74B9FF', '#00CEC9', '#FF7675'],
          hoverBackgroundColor: ['#8B7EE8', '#55EFC4', '#FDE68A', '#F8A4A4', '#A8D8FF', '#81ECEC', '#FFA4A4']
        }]
      };
    }

    // Graphique tendance des présences
    if (charts.attendanceTrend) {
      const points = charts.attendanceTrend.points || [];
      const labels = points.map((p: { date: any; }) => p.date);
      const data = points.map((p: { attendance: any; }) => p.attendance);

      this.attendanceChartData = {
        labels: labels,
        datasets: [{
          label: 'Présences',
          data: data,
          borderColor: '#6C5CE7',
          backgroundColor: 'rgba(108, 92, 231, 0.1)',
          fill: true,
          tension: 0.4
        }]
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 🛠️ MÉTHODES D'AFFICHAGE (statuts, labels...)
  // ──────────────────────────────────────────────────────────────────

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

  getFormattedNumber(value: number): string {
    return value.toLocaleString('fr-FR');
  }

  // ──────────────────────────────────────────────────────────────────
  // 👤 INTERACTIONS
  // ──────────────────────────────────────────────────────────────────

  toggleSidebar(): void {
    this.sidebarComponent?.onMenuToggleClick();
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

    // Ferme aussi la cloche des notifications au clic extérieur.
    if (!target.closest('.topbar-notif')) {
      this.notificationsOpen = false;
    }
  }

  logout(): void {
    this.tokenService.logout();
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login'])
    });
  }
}
