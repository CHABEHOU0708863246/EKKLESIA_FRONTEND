import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate } from '@angular/service-worker';

/**
 * Gestion des mises à jour du Service Worker (PWA web).
 *
 * Sans ce mécanisme, une PWA installée peut continuer à servir une ancienne
 * version (index + JS/CSS précachés) pendant des jours : c'est l'une des causes
 * d'un menu hamburger « qui ne réagit pas » alors que le correctif est déjà
 * déployé.
 *
 * Stratégie :
 *  - vérification au démarrage, au retour au premier plan et périodiquement ;
 *  - dès qu'une version est prête, on l'active et on recharge SI l'application
 *    est en arrière-plan (aucune saisie en cours) ;
 *  - sinon on affiche un bandeau « Recharger » (l'utilisateur choisit le moment).
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly swUpdate = inject(SwUpdate, { optional: true });

  /** Vrai lorsqu'une nouvelle version est téléchargée et attend l'activation. */
  readonly updateAvailable = signal(false);

  private initialized = false;
  private applying = false;
  private watchdog?: ReturnType<typeof setInterval>;
  private visibilityHandler?: () => void;

  /** À appeler une seule fois depuis le composant racine (navigateur uniquement). */
  init(): void {
    if (this.initialized || !isPlatformBrowser(this.platformId) || !this.swUpdate?.isEnabled) {
      return;
    }
    this.initialized = true;

    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.updateAvailable.set(true);

        // Application invisible (onglet en arrière-plan, app minimisée) :
        // c'est le moment le plus sûr pour recharger sans perdre de saisie.
        if (document.visibilityState === 'hidden') {
          void this.applyUpdate();
        }
      }
    });

    this.visibilityHandler = () => {
      if (document.visibilityState === 'hidden' && this.updateAvailable()) {
        void this.applyUpdate();
      } else if (document.visibilityState === 'visible') {
        void this.swUpdate?.checkForUpdate();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // Filet de sécurité : vérification périodique sans bloquer l'utilisateur.
    this.watchdog = setInterval(() => {
      if (document.visibilityState === 'visible') void this.swUpdate?.checkForUpdate();
    }, 30 * 60 * 1000);

    void this.swUpdate.checkForUpdate();
  }

  /** Active la version en attente puis recharge l'application. */
  async applyUpdate(): Promise<void> {
    if (this.applying || !this.swUpdate || !isPlatformBrowser(this.platformId)) return;

    this.applying = true;
    try {
      await this.swUpdate.activateUpdate();
      document.location.reload();
    } catch {
      this.applying = false;
    }
  }

  /** Libère le watchdog et l'écouteur (tests / destruction). */
  dispose(): void {
    if (this.watchdog) {
      clearInterval(this.watchdog);
      this.watchdog = undefined;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = undefined;
    }
  }
}
