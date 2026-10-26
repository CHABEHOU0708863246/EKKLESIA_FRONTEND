import { Component, signal, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { NativeAppEventsService, ConnectivityService } from './core/services/Native';
import { BackendWarmupService } from './core/services/Native/backend-warmup.service';
import { AppUpdateService } from './core/services/AppUpdate/app-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('EKKLESIA_FRONTEND');

  private readonly nativeEvents = inject(NativeAppEventsService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly warmup = inject(BackendWarmupService);
  private readonly appUpdate = inject(AppUpdateService);

  /** État connexion exposé au template (bandeau hors-ligne). */
  readonly online = this.connectivity.online;

  /** Une nouvelle version PWA est prête (bandeau « Recharger »). */
  readonly updateAvailable = this.appUpdate.updateAvailable;

  async ngOnInit(): Promise<void> {
    // Retire l'écran de démarrage HTML dès que le composant racine est monté
    // (le temps que le routeur affiche la première page).
    this.hideBootScreen();

    // Réveille le backend (Render) dès le lancement, puis le garde chaud.
    this.warmup.start();

    // PWA : applique les mises à jour au lieu de servir indéfiniment
    // l'ancienne version mise en cache par le Service Worker.
    this.appUpdate.init();

    // Bouton « retour » matériel Android : navigue en arrière, sinon quitte l'app.
    await this.nativeEvents.registerBackButton(() => {
      if (Capacitor.isNativePlatform()) {
        import('@capacitor/app').then(({ App: CapApp }) => CapApp.exitApp());
      }
    });
  }

  ngOnDestroy(): void {
    this.appUpdate.dispose();
  }

  /** Active la version PWA en attente et recharge la page. */
  applyUpdate(): void {
    void this.appUpdate.applyUpdate();
  }

  /** Masque puis supprime l'écran de démarrage de `index.html`. */
  private hideBootScreen(): void {
    const boot = document.getElementById('miav-boot');
    if (!boot) return;
    boot.classList.add('miav-boot--hide');
    setTimeout(() => boot.remove(), 400);
  }
}
