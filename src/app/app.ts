import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { NativeAppEventsService, ConnectivityService } from './core/services/Native';

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

  /** État connexion exposé au template (bandeau hors-ligne). */
  readonly online = this.connectivity.online;

  async ngOnInit(): Promise<void> {
    // Bouton « retour » matériel Android : navigue en arrière, sinon quitte l'app.
    await this.nativeEvents.registerBackButton(() => {
      if (Capacitor.isNativePlatform()) {
        import('@capacitor/app').then(({ App: CapApp }) => CapApp.exitApp());
      }
    });
  }
}
