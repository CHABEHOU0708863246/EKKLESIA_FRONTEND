/**
 * Couche native EKKLESIA (Capacitor) — services avec fallback web.
 *
 * Principe : un service par capacité native ; chacun détecte la plateforme
 * (`PlatformService`) et branche soit l'API native, soit un équivalent web.
 * Ainsi, `ng serve` (navigateur) continue de fonctionner sans modification.
 */
export { PlatformService } from './platform.service';
export { NativeAppService } from './native-app.service';
export { NativeCameraService } from './native-camera.service';
export { NativeBrowserService } from './native-browser.service';
export { NativeShareService } from './native-share.service';
export { NativePreferencesService } from './native-preferences.service';
export { NativeAppEventsService } from './native-app-events.service';
export { NativePushService } from './native-push.service';
export { ConnectivityService } from './connectivity.service';
