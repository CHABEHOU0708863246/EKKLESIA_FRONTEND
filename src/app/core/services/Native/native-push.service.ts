import { Injectable, inject } from '@angular/core';
import { PlatformService } from './platform.service';

/**
 * Notifications push natives (Android/iOS) via @capacitor/push-notifications.
 * Sur le web : no-op (les notifications in-app restent gérées par
 * `notifications-app.ts`, indépendamment de ce service).
 *
 * L'enregistrement renvoie le jeton FCM/APNs que l'application peut transmettre
 * au backend (le backend possède déjà `NotificationDispatchWorker`).
 */
@Injectable({ providedIn: 'root' })
export class NativePushService {
  private readonly platform = inject(PlatformService);

  /**
   * Demande la permission, s'abonne et retourne le token de push.
   * @returns le token natif, ou `null` (web, refus, échec).
   */
  async register(): Promise<string | null> {
    if (!this.platform.isNative) return null;

    const { PushNotifications } = await import('@capacitor/push-notifications');

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return null;

    return new Promise<string | null>((resolve) => {
      PushNotifications.addListener('registration', (token) => resolve(token.value));
      PushNotifications.addListener('registrationError', () => resolve(null));
      PushNotifications.register();
    });
  }

  /** Écoute les notifications reçues au premier plan. */
  async onForeground(callback: (data: Record<string, unknown>) => void): Promise<void> {
    if (!this.platform.isNative) return;
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.addListener('pushNotificationReceived', (n) =>
      callback((n.data ?? {}) as Record<string, unknown>)
    );
  }
}
