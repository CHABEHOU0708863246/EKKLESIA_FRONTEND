import { Injectable, inject } from '@angular/core';
import { PlatformService } from './platform.service';

/**
 * Petites préférences locales (thème, dernier onglet, filtres…).
 * Natif : @capacitor/preferences. Web : localStorage. API asynchrone unifiée.
 */
@Injectable({ providedIn: 'root' })
export class NativePreferencesService {
  private readonly platform = inject(PlatformService);

  async get(key: string): Promise<string | null> {
    if (this.platform.isNative) {
      const { Preferences } = await import('@capacitor/preferences');
      return (await Preferences.get({ key })).value;
    }
    return localStorage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    if (this.platform.isNative) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
      return;
    }
    localStorage.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    if (this.platform.isNative) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key });
      return;
    }
    localStorage.removeItem(key);
  }
}
