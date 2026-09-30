import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Settings, SETTINGS_TYPES, SettingItem } from '../../../../core/services/Settings/settings';
import { Notification } from '../../../../core/services/Notification/notification';

/**
 * Écran Paramètres générique : statuts, catégories, âges, visiteurs, pays,
 * devises. Un élément utilisé ne peut qu'être désactivé (bouton Supprimer
 * désactivé). (RG-P3-1)
 */
@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sp-page">
      <h1>Paramètres</h1>
      <p class="sp-sub">Référentiels de l'application. Chaque modification est tracée.</p>

      <div class="sp-tabs">
        @for (t of types; track t.key) {
          <button type="button" class="sp-tab" [class.is-active]="t.key === activeType()" (click)="selectType(t.key)">
            <i class="bx" [ngClass]="t.icon"></i> {{ t.label }}
          </button>
        }
      </div>

      <div class="miav-card sp-add">
        <input class="miav-input" [(ngModel)]="newCode" placeholder="Code (ex. CustomX)" />
        <input class="miav-input" [(ngModel)]="newLabel" placeholder="Libellé affiché" />
        <button class="miav-btn miav-btn--primary" (click)="create()" [disabled]="!newCode || !newLabel">Ajouter</button>
      </div>

      @if (loading()) {
        <p style="color:#64748b">Chargement…</p>
      } @else {
        <table class="sp-table">
          <thead><tr><th>Libellé</th><th>Code</th><th>Usage</th><th>Actif</th><th></th></tr></thead>
          <tbody>
            @for (it of items(); track it.code) {
              <tr>
                <td>{{ it.label }}</td>
                <td>
                  <code>{{ it.code }}</code>
                  @if (it.isSystem) { <span class="sp-badge">système</span> }
                </td>
                <td>{{ it.usageCount ?? 0 }}</td>
                <td>
                  <input type="checkbox" [checked]="it.isActive" (change)="toggle(it, $any($event.target).checked)" />
                </td>
                <td>
                  <button type="button" class="sp-del" (click)="remove(it)"
                          [disabled]="it.isSystem || (it.usageCount ?? 0) > 0"
                          [title]="it.isSystem ? 'Paramètre système : désactivation uniquement' : ((it.usageCount ?? 0) > 0 ? 'Utilisé : désactivation uniquement' : 'Supprimer')">
                    Supprimer
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" style="color:#64748b">Aucun élément.</td></tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .sp-page { max-width: 1040px; margin: 0 auto; padding: 24px 16px; }
    .sp-sub { color: #64748b; }
    .sp-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
    .sp-tab { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #e2e8f0; background: #fff; border-radius: 999px; padding: 7px 14px; cursor: pointer; font-weight: 600; color: #475569; }
    .sp-tab.is-active { background: #6c5ce7; color: #fff; border-color: #6c5ce7; }
    .sp-add { display: flex; gap: 10px; padding: 14px; flex-wrap: wrap; margin-bottom: 14px; }
    .sp-add .miav-input { flex: 1; min-width: 180px; }
    .sp-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; }
    .sp-table th, .sp-table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #eef0f7; }
    .sp-table code { background: #f1f2f7; padding: 1px 6px; border-radius: 6px; }
    .sp-badge { background: #eef0f7; color: #64748b; font-size: 11px; border-radius: 999px; padding: 1px 8px; margin-left: 6px; }
    .sp-del { border: 1px solid #f0c2c2; background: #fff; color: #e04646; border-radius: 8px; padding: 5px 10px; cursor: pointer; }
    .sp-del:disabled { opacity: .45; cursor: not-allowed; }
  `],
})
export class SettingsPage implements OnInit {
  private settings = inject(Settings);
  private notification = inject(Notification);

  readonly types = SETTINGS_TYPES;
  activeType = signal<string>(SETTINGS_TYPES[0].key);
  items = signal<SettingItem[]>([]);
  loading = signal(false);
  newCode = '';
  newLabel = '';

  ngOnInit(): void {
    this.load();
  }

  selectType(key: string): void {
    this.activeType.set(key);
    this.newCode = '';
    this.newLabel = '';
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.settings.list(this.activeType()).subscribe({
      next: (r) => { this.loading.set(false); this.items.set(r?.data ?? []); },
      error: () => this.loading.set(false),
    });
  }

  create(): void {
    const item: SettingItem = { code: this.newCode.trim(), label: this.newLabel.trim(), sortOrder: 50, isActive: true, isSystem: false };
    this.settings.create(this.activeType(), item).subscribe({
      next: () => { this.newCode = ''; this.newLabel = ''; this.notification.success('Ajouté', ''); this.load(); },
      error: (e) => this.notification.error('Échec', e?.error?.message || 'Ajout impossible.'),
    });
  }

  toggle(item: SettingItem, active: boolean): void {
    this.settings.setActive(this.activeType(), item.id!, active).subscribe({ next: () => this.load() });
  }

  remove(item: SettingItem): void {
    this.settings.delete(this.activeType(), item.id!).subscribe({
      next: () => { this.notification.success('Supprimé', ''); this.load(); },
      error: (e) => this.notification.error('Suppression impossible', e?.error?.message || 'Élément utilisé ou système.'),
    });
  }
}
