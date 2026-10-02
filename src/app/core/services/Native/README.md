# Couche native (Capacitor) — EKKLESIA

Services natifs avec **fallback web** : `ng serve` continue de fonctionner.

| Service | Capacité | Natif | Fallback web |
|---|---|---|---|
| `PlatformService` | détection plateforme | `Capacitor.getPlatform()` | `web` |
| `NativeAppService` | barre de statut + splash | status-bar / splash-screen | no-op |
| `NativeCameraService` | photo / image | `@capacitor/camera` | `<input type="file">` |
| `NativeBrowserService` | ouvrir un lien (paiement) | `@capacitor/browser` | `window.open` |
| `NativeShareService` | partager | `@capacitor/share` | Web Share API / copie |
| `NativePreferencesService` | préférences locales | `@capacitor/preferences` | `localStorage` |
| `NativeAppEventsService` | retour Android / resume | `@capacitor/app` | `visibilitychange` |
| `NativePushService` | push | `@capacitor/push-notifications` | no-op |
| `ConnectivityService` | état réseau (signal) | `@capacitor/network` | `online/offline` |

## Usage

```ts
import { NativeCameraService, NativeShareService } from './core/services/Native';

private readonly camera = inject(NativeCameraService);
const file: File | null = await this.camera.pickImage('camera');
```

## Points d'attention

- **JWT** : le service `Token` utilise `localStorage` (la WebView Capacitor est
  sandboxée par l'OS). Migrer vers `capacitor-secure-storage-plugin` (installé)
  est possible mais rend le stockage **asynchrone** : refonte à prévoir si exigé.
- **Caméra** : sur natif, la première utilisation demande la permission ; en cas
  de refus, `pickImage` retourne `null`.
- **Push** : `register()` renvoie le token FCM/APNs — à transmettre au backend
  (qui possède déjà `NotificationDispatchWorker`).
- **Fallback web obligatoire** : tout nouveau plugin doit avoir sa branche
  navigateur, sinon `ng serve` casse.
