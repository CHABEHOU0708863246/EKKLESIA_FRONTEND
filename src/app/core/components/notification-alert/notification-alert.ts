import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { AppNotifications } from '../../services/Notifications/notifications-app';
import { Permissions } from '../../services/Permissions/permissions';
import { Token } from '../../services/Token/token';
import { AppNotification } from '../../models/Notifications/app-notification.model';

const DISMISS_KEY = 'ekklesia_notif_alert_dismissed';

/**
 * Bandeau d'alerte affiché à la connexion lorsqu'il existe des notifications
 * non lues : badge « URGENT » clignotant + défilement lent des messages,
 * à la manière des alertes des journaux en ligne.
 */
@Component({
  selector: 'app-notification-alert',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (visible()) {
      <div class="na-banner" role="alert" aria-live="polite">
        <span class="na-badge"><i class="bx bx-error-circle"></i> URGENT</span>
        <div class="na-marquee" (click)="openAll()" title="Cliquer pour voir toutes mes notifications">
          <div class="na-marquee__inner">
            @for (n of unread(); track n.id) {
              <span class="na-msg">
                <i class="bx" [ngClass]="iconFor(n.type)"></i>
                {{ n.title }}
              </span>
              <span class="na-sep">•</span>
            }
          </div>
        </div>
        <button type="button" class="na-action" (click)="openAll()">Voir ({{ count() }})</button>
        <button type="button" class="na-close" (click)="dismiss()" aria-label="Fermer">
          <i class="bx bx-x"></i>
        </button>
      </div>
    }
  `,
  styles: [`
    .na-banner {
      position: sticky; top: 0; z-index: 1200;
      display: flex; align-items: center; gap: 12px;
      padding: 8px 12px;
      background: linear-gradient(90deg, #B3121C 0%, #E17055 100%);
      color: #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,.25);
    }
    .na-badge {
      display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto;
      background: #fff; color: #B3121C; font-weight: 800; font-size: 12px;
      letter-spacing: .5px; padding: 4px 10px; border-radius: 999px;
      text-transform: uppercase;
      animation: na-blink 1s steps(2, start) infinite;
    }
    @keyframes na-blink { 50% { opacity: .25; } }
    .na-marquee { flex: 1 1 auto; overflow: hidden; white-space: nowrap; cursor: pointer; }
    .na-marquee__inner { display: inline-block; white-space: nowrap; animation: na-scroll 26s linear infinite; }
    .na-banner:hover .na-marquee__inner { animation-play-state: paused; }
    @keyframes na-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
    .na-msg { font-weight: 600; font-size: 14px; }
    .na-msg i { margin-right: 6px; }
    .na-sep { margin: 0 14px; opacity: .7; }
    .na-action {
      flex: 0 0 auto; border: 1px solid rgba(255,255,255,.65); background: rgba(255,255,255,.12);
      color: #fff; font-weight: 700; font-size: 12.5px; padding: 5px 12px; border-radius: 8px; cursor: pointer;
    }
    .na-action:hover { background: rgba(255,255,255,.22); }
    .na-close { flex: 0 0 auto; border: none; background: transparent; color: #fff; font-size: 20px; line-height: 1; cursor: pointer; }
    @media (prefers-reduced-motion: reduce) {
      .na-badge, .na-marquee__inner { animation: none; }
    }
  `],
})
export class NotificationAlert implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  visible = signal(false);
  unread = signal<AppNotification[]>([]);
  count = signal(0);

  constructor(
    private notificationsApi: AppNotifications,
    private permissions: Permissions,
    private tokenService: Token,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.tokenService.isLogged() || this.tokenService.isTokenExpired()) return;
    if (!this.permissions.canViewNotifications()) return;

    // Ne pas ré-afficher pendant la même session une fois fermé.
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    } catch { /* stockage indisponible */ }

    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private load(): void {
    this.notificationsApi.getUnreadCount().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        const n = res?.data?.unread ?? 0;
        this.count.set(n);
        if (n > 0) this.loadUnread();
      },
      error: () => { /* silencieux : ne jamais gêner la navigation */ }
    });
  }

  private loadUnread(): void {
    this.notificationsApi.getMine(true, 1, 10).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        const items = res?.data?.items ?? [];
        this.unread.set(items);
        this.count.set(res?.data?.unreadCount ?? items.length);
        if (items.length > 0) this.visible.set(true);
      },
      error: () => { /* silencieux */ }
    });
  }

  openAll(): void {
    this.router.navigate(['/dashboard/mes-notifications']);
  }

  dismiss(): void {
    this.visible.set(false);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  iconFor(type: string): string {
    switch (type) {
      case 'Success': return 'bx-check-circle';
      case 'Warning': return 'bx-error';
      case 'Error': return 'bx-x-circle';
      case 'Reminder': return 'bx-time-five';
      case 'Alert': return 'bx-error-circle';
      default: return 'bx-info-circle';
    }
  }
}
