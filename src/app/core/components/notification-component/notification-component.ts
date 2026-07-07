// src/app/core/components/notification-component/notification-component.ts
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNotification, Notification } from '../../services/Notification/notification';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-notification-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-component.html',
  styleUrl: './notification-component.scss',
})
export class NotificationComponent implements OnInit {
  notifications: AppNotification[] = [];

  // ✅ Utiliser inject() au lieu du constructeur
  private notificationService = inject(Notification);
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // ✅ Vérifier qu'on est dans le navigateur avant de s'abonner
    if (isPlatformBrowser(this.platformId)) {
      this.notificationService.notifications$.subscribe(
        (notifications) => {
          this.notifications = notifications;
        }
      );
    }
  }

  remove(id: number): void {
    if (isPlatformBrowser(this.platformId)) {
      this.notificationService.remove(id);
    }
  }
}
