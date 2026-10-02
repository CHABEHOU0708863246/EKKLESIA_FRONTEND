import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { NativeAppEventsService, ConnectivityService } from './core/services/Native';
import { BackendWarmupService } from './core/services/Native/backend-warmup.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('EKKLESIA_FRONTEND');

  private readonly nativeEvents = inject(NativeAppEventsService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly warmup = inject(BackendWarmupService);

  /** État connexion exposé au template (bandeau hors-ligne). */
  readonly online = this.connectivity.online;

  async ngOnInit(): Promise<void> {
    // Retire l'écran de démarrage HTML dès que le composant racine est monté
    // (le temps que le routeur affiche la première page).
    this.hideBootScreen();

    // Réveille le backend (Render) dès le lancement, puis le garde chaud.
    this.warmup.start();

    // Bouton « retour » matériel Android : navigue en arrière, sinon quitte l'app.
    await this.nativeEvents.registerBackButton(() => {
      if (Capacitor.isNativePlatform()) {
        import('@capacitor/app').then(({ App: CapApp }) => CapApp.exitApp());
      }
    });
  }

  /** Masque puis supprime l'écran de démarrage de `index.html`. */
  private hideBootScreen(): void {
    const boot = document.getElementById('miav-boot');
    if (!boot) return;
    boot.classList.add('miav-boot--hide');
    setTimeout(() => boot.remove(), 400);
  }
}
