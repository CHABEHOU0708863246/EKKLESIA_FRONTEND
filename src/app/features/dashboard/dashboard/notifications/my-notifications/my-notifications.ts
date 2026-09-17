// src/app/features/dashboard/dashboard/notifications/my-notifications/my-notifications.ts

import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { AppNotifications } from '../../../../../core/services/Notifications/notifications-app';
import { Permissions } from '../../../../../core/services/Permissions/permissions';
import { Notification as Toast } from '../../../../../core/services/Notification/notification';
import { Roles } from '../../../../../core/services/Roles/roles';
import { Church as ChurchService } from '../../../../../core/services/Church/church';
import {
  AppNotification,
  AppNotificationCreate,
  AppNotificationPreferences,
  AppNotificationType,
  AppNotificationCategory,
  NotificationTargetType,
  NOTIFICATION_TYPE_OPTIONS,
  NOTIFICATION_CATEGORY_OPTIONS,
  NOTIFICATION_TARGET_OPTIONS
} from '../../../../../core/models/Notifications/app-notification.model';

@Component({
  selector: 'app-my-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './my-notifications.html',
  styleUrl: './my-notifications.scss',
})
export class MyNotifications implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private isBrowser: boolean;

  notifications = signal<AppNotification[]>([]);
  unreadCount = signal(0);
  totalCount = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  pageSize = 15;
  loading = signal(false);
  unreadOnly = false;

  preferences: AppNotificationPreferences | null = null;
  savingPreferences = signal(false);
  showPreferences = signal(false);

  readonly typeOptions = NOTIFICATION_TYPE_OPTIONS;
  readonly categoryOptions = NOTIFICATION_CATEGORY_OPTIONS;
  readonly targetOptions = NOTIFICATION_TARGET_OPTIONS;

  // ── Envoi ciblé (Notification_Send) ──
  showSendForm = signal(false);
  sending = signal(false);
  roles: { value: string; label: string }[] = [];
  churches: { id: string; name: string }[] = [];

  sendForm = {
    title: '',
    message: '',
    type: 'Info' as AppNotificationType,
    category: 'System' as AppNotificationCategory,
    link: '',
    targetType: 'User' as NotificationTargetType,
    targetId: '',
    emailEnabled: false,
    scheduledAt: ''
  };

  constructor(
    private notificationsService: AppNotifications,
    public permissions: Permissions,
    private toast: Toast,
    private rolesService: Roles,
    private churchService: ChurchService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowserLike(this.platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.load();
    this.loadPreferences();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ──────────────────────────────────────────────────────────────

  load(): void {
    this.loading.set(true);

    this.notificationsService
      .getMine(this.unreadOnly, this.currentPage(), this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success && response.data) {
            this.notifications.set(response.data.items ?? []);
            this.unreadCount.set(response.data.unreadCount ?? 0);
            this.totalCount.set(response.data.totalCount ?? 0);
            this.totalPages.set(response.data.totalPages || 1);
          } else {
            this.notifications.set([]);
          }
        },
        error: () => this.loading.set(false)
      });
  }

  setFilter(unreadOnly: boolean): void {
    this.unreadOnly = unreadOnly;
    this.currentPage.set(1);
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.load();
  }

  private loadPreferences(): void {
    this.notificationsService
      .getPreferences()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) this.preferences = response.data;
        }
      });
  }

  // ──────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────

  open(notification: AppNotification): void {
    if (!notification.isRead) {
      this.notificationsService.markRead(notification.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: () => { notification.isRead = true; this.load(); } });
    }
  }

  markRead(notification: AppNotification, event: Event): void {
    event.stopPropagation();
    this.notificationsService.markRead(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            notification.isRead = true;
            this.unreadCount.update((n) => Math.max(0, n - 1));
          }
        }
      });
  }

  markAllRead(): void {
    this.notificationsService.markAllRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toast.success('Notifications', `${response.data ?? 0} notification(s) marquée(s) lue(s).`);
            this.load();
          }
        }
      });
  }

  remove(notification: AppNotification, event: Event): void {
    event.stopPropagation();
    this.notificationsService.delete(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notifications.update((list) => list.filter((n) => n.id !== notification.id));
            this.totalCount.update((n) => Math.max(0, n - 1));
          }
        }
      });
  }

  togglePreferences(): void {
    this.showPreferences.update((v) => !v);
  }

  savePreferences(): void {
    if (!this.preferences) return;

    this.savingPreferences.set(true);
    this.notificationsService.savePreferences(this.preferences)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.savingPreferences.set(false);
          if (response.success) {
            this.toast.success('Préférences', 'Vos préférences de notification sont enregistrées.');
          } else {
            this.toast.error('Préférences', response.message || 'Enregistrement impossible.');
          }
        },
        error: () => this.savingPreferences.set(false)
      });
  }

  // ──────────────────────────────────────────────────────────────
  // ENVOI CIBLÉ
  // ──────────────────────────────────────────────────────────────

  toggleSendForm(): void {
    this.showSendForm.update((v) => !v);

    if (this.showSendForm() && this.roles.length === 0) {
      this.rolesService.getRoles().pipe(takeUntil(this.destroy$)).subscribe({
        next: (response: any) => {
          const items = response?.data?.items ?? response?.items ?? response?.data ?? [];
          this.roles = (Array.isArray(items) ? items : [])
            .map((r: any) => ({ value: r.code ?? r.name, label: r.displayName ?? r.name }));
        },
        error: () => (this.roles = [])
      });
    }

    if (this.showSendForm() && this.churches.length === 0) {
      this.churchService.getAllChurches().pipe(takeUntil(this.destroy$)).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.churches = response.data.map((c) => ({ id: c.id, name: c.name }));
          }
        },
        error: () => (this.churches = [])
      });
    }
  }

  send(): void {
    if (!this.sendForm.title.trim() || !this.sendForm.message.trim()) {
      this.toast.warning('Formulaire incomplet', 'Le titre et le message sont requis.');
      return;
    }

    if (this.sendForm.targetType !== 'Global' && !this.sendForm.targetId.trim()) {
      this.toast.warning('Cible manquante', 'Indiquez la cible de la notification.');
      return;
    }

    this.sending.set(true);

    const payload: AppNotificationCreate = {
      title: this.sendForm.title.trim(),
      message: this.sendForm.message.trim(),
      type: this.sendForm.type,
      category: this.sendForm.category,
      link: this.sendForm.link.trim() || undefined,
      targetType: this.sendForm.targetType,
      targetId: this.sendForm.targetType === 'Global' ? undefined : this.sendForm.targetId.trim(),
      emailEnabled: this.sendForm.emailEnabled,
      scheduledAt: this.sendForm.scheduledAt || undefined
    };

    this.notificationsService.send(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.sending.set(false);
          if (response.success) {
            this.toast.success(
              'Notification envoyée',
              `${response.data?.recipients ?? 0} destinataire(s)${response.data?.emailQueued ? ` — ${response.data.emailQueued} email(s) en file` : ''}.`
            );
            this.showSendForm.set(false);
            this.sendForm = {
              ...this.sendForm,
              title: '', message: '', link: '', targetId: '', scheduledAt: ''
            };
            this.load();
          } else {
            this.toast.error('Envoi impossible', response.message || 'Erreur lors de l’envoi.');
          }
        },
        error: () => this.sending.set(false)
      });
  }

  // ──────────────────────────────────────────────────────────────
  // AFFICHAGE
  // ──────────────────────────────────────────────────────────────

  getTypeColor(type: AppNotificationType): string {
    return this.typeOptions.find((t) => t.value === type)?.color ?? '#6C5CE7';
  }

  getTypeIcon(type: AppNotificationType): string {
    switch (type) {
      case 'Success': return 'bx-check-circle';
      case 'Warning': return 'bx-error';
      case 'Error': return 'bx-x-circle';
      case 'Reminder': return 'bx-time-five';
      case 'Alert': return 'bx-bell';
      default: return 'bx-info-circle';
    }
  }

  getTypeLabel(type: AppNotificationType): string {
    return this.typeOptions.find((t) => t.value === type)?.label ?? type;
  }

  formatDateTime(value: string): string {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}

/**
 * Évite d'importer isPlatformBrowser uniquement pour ce test : le composant est
 * rendu côté navigateur dans l'application comme dans les specs.
 */
function isPlatformBrowserLike(_platformId: object): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}
