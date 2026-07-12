// src/app/core/services/Notification/notification.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface AppNotification {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  icon?: string;
}

@Injectable({
  providedIn: 'root',
})
export class Notification {
  private notifications = new BehaviorSubject<AppNotification[]>([]);
  public notifications$: Observable<AppNotification[]> = this.notifications.asObservable();
  private notificationId = 0;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  success(title: string, message: string, duration: number = 4000): void {
    if (!this.isBrowser) return;
    this.show({
      type: 'success',
      title,
      message,
      duration,
      icon: '✓'
    });
  }

  error(title: string, message: string, duration: number = 5000): void {
    if (!this.isBrowser) return;
    this.show({
      type: 'error',
      title,
      message,
      duration,
      icon: '✕'
    });
  }

  warning(title: string, message: string, duration: number = 4000): void {
    if (!this.isBrowser) return;
    this.show({
      type: 'warning',
      title,
      message,
      duration,
      icon: '⚠'
    });
  }

  info(title: string, message: string, duration: number = 4000): void {
    if (!this.isBrowser) return;
    this.show({
      type: 'info',
      title,
      message,
      duration,
      icon: 'ℹ'
    });
  }



  private show(notification: Omit<AppNotification, 'id'>): void {
    if (!this.isBrowser) return;

    const id = ++this.notificationId;
    const newNotification: AppNotification = {
      ...notification,
      id
    };

    const currentNotifications = this.notifications.value;
    this.notifications.next([...currentNotifications, newNotification]);

    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, notification.duration);
    }
  }

  remove(id: number): void {
    if (!this.isBrowser) return;

    const currentNotifications = this.notifications.value;
    this.notifications.next(
      currentNotifications.filter(notification => notification.id !== id)
    );
  }

  clear(): void {
    if (!this.isBrowser) return;
    this.notifications.next([]);
  }
}
