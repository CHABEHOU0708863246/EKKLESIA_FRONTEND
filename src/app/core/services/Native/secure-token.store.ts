import { Injectable, inject } from '@angular/core';
import { PlatformService } from './platform.service';

/**
 * Persistance CHIFFRÉE du token (natif uniquement).
 *
 * Stratégie sans rupture : `Token` continue d'utiliser `localStorage` (accès
 * synchrone immédiat, indispensable aux intercepteurs HTTP). Ce store écrit en
 * PARALLÈLE une copie chiffrée via `capacitor-secure-storage-plugin`, utilisée
 * pour la persistance sécurisée sur l'appareil.
 *
 * Sur le web : no-op (aucun impact).
 */
@Injectable({ providedIn: 'root' })
export class SecureTokenStore {
  private readonly platform = inject(PlatformService);

  private readonly KEY_AUTH = 'ekklesia_auth_data';
  private readonly KEY_REFRESH = 'refresh_token';

  /** Duplique (chiffré) les données de session. Best-effort, non bloquant. */
  async mirror(authData: string, refreshToken?: string): Promise<void> {
    if (!this.platform.isNative) return;
    try {
      const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
      await SecureStoragePlugin.set({ key: this.KEY_AUTH, value: authData });
      if (refreshToken) await SecureStoragePlugin.set({ key: this.KEY_REFRESH, value: refreshToken });
    } catch {
      /* plugin indisponible : on ignore (localStorage reste la source) */
    }
  }

  /** Lit la copie chiffrée (utile par ex. pour restaurer après réinstallation). */
  async read(): Promise<string | null> {
    if (!this.platform.isNative) return null;
    try {
      const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
      const { value } = await SecureStoragePlugin.get({ key: this.KEY_AUTH });
      return value ?? null;
    } catch {
      return null;
    }
  }

  /** Purge la copie chiffrée. */
  async clear(): Promise<void> {
    if (!this.platform.isNative) return;
    try {
      const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
      await SecureStoragePlugin.remove({ key: this.KEY_AUTH }).catch(() => {});
      await SecureStoragePlugin.remove({ key: this.KEY_REFRESH }).catch(() => {});
    } catch {
      /* ignore */
    }
  }
}
