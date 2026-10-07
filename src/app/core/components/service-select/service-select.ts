import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Service } from '../../models/Events/service.model';

/**
 * Sélecteur de CULTE (cultes = services) avec badge NON BLOQUANT
 * « Offrande existante » pour les cultes ayant déjà des offrandes associées.
 *
 * - Le culte reste toujours sélectionnable (l'utilisateur peut ajouter une
 *   nouvelle offrande au même culte).
 * - Le badge porte une infobulle explicative au survol.
 * - S'utilise avec `formControlName` (ControlValueAccessor, valeur = id du culte).
 */
@Component({
  selector: 'app-service-select',
  standalone: true,
  imports: [CommonModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ServiceSelect), multi: true }],
  template: `
    <div class="ss" [class.ss--disabled]="disabled()">
      <button type="button" class="ss-trigger" [class.ss-trigger--open]="open()"
              [disabled]="disabled()" (click)="toggle()" (blur)="onBlur()">
        @if (selected(); as s) {
          <span class="ss-trigger-text">
            <span class="ss-trigger-label">{{ labelOf(s) }}</span>
            @if (s.hasExistingOffering) {
              <span class="ss-badge" [title]="tooltip(s)">
                <i class="bx bx-receipt"></i> Offrande existante
              </span>
            }
          </span>
        } @else {
          <span class="ss-placeholder">{{ placeholder }}</span>
        }
        <i class="bx bx-chevron-down ss-caret"></i>
      </button>

      @if (open()) {
        <div class="ss-dropdown">
          @if (services.length === 0) {
            <p class="ss-empty">Aucun culte disponible.</p>
          }
          @for (s of services; track s.id) {
            <button type="button" class="ss-option" [class.ss-option--selected]="s.id === value()"
                    (mousedown)="choose(s)">
              <span class="ss-option-label">{{ labelOf(s) }}</span>
              @if (s.hasExistingOffering) {
                <span class="ss-badge" [title]="tooltip(s)">
                  <i class="bx bx-receipt"></i> Offrande existante
                </span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .ss { position: relative; width: 100%; }
    .ss-trigger {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      width: 100%; text-align: left; cursor: pointer;
      border: 1px solid var(--ekk-border, #d7dbe0); border-radius: 8px;
      background: #fff; padding: 9px 12px; font-size: 14px; font-family: inherit;
      color: var(--ekk-ink, #1f2430);
    }
    .ss-trigger--open { border-color: var(--ekk-violet-600, #5b3a8e); box-shadow: 0 0 0 3px rgba(91,58,142,.14); }
    .ss-trigger:disabled { opacity: .6; cursor: default; }
    .ss-trigger-text { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
    .ss-trigger-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ss-placeholder { color: #9aa2b1; }
    .ss-caret { font-size: 18px; color: #8a90a0; flex: none; }
    .ss-dropdown {
      position: absolute; z-index: 50; left: 0; right: 0; top: calc(100% + 4px);
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      box-shadow: 0 10px 28px rgba(15,23,42,.14); max-height: 320px; overflow: auto; padding: 4px;
    }
    .ss-empty { margin: 0; padding: 12px; color: #64748b; font-size: 13px; }
    .ss-option {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      width: 100%; text-align: left; background: none; border: none; cursor: pointer;
      padding: 9px 10px; border-radius: 8px; font-size: 13.5px; color: #1f2430;
    }
    .ss-option:hover { background: #f5f3ff; }
    .ss-option--selected { background: #eef1f8; font-weight: 600; }
    .ss-option-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ss-badge {
      display: inline-flex; align-items: center; gap: 4px; flex: none;
      padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
      background: rgba(240, 180, 41, 0.22); color: #8a6510; white-space: nowrap;
      cursor: help;
    }
    .ss-badge i { font-size: 13px; }
  `],
})
export class ServiceSelect implements ControlValueAccessor {
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input() services: Service[] = [];
  @Input() placeholder = '— Sélectionner un culte —';

  open = signal(false);
  disabled = signal(false);
  value = signal<string>('');

  private onChangeFn: (value: string | null) => void = () => {};
  private onTouchedFn: () => void = () => {};

  writeValue(value: string | null): void { this.value.set(value ?? ''); }
  registerOnChange(fn: (value: string | null) => void): void { this.onChangeFn = fn; }
  registerOnTouched(fn: () => void): void { this.onTouchedFn = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }

  /** Culte sélectionné résolu depuis la liste. */
  selected(): Service | null {
    const id = this.value();
    return id ? (this.services.find((s) => s.id === id) ?? null) : null;
  }

  toggle(): void {
    if (this.disabled()) return;
    this.open.update((v) => !v);
  }

  choose(s: Service): void {
    this.value.set(s.id);
    this.open.set(false);
    this.onTouchedFn();
    this.onChangeFn(s.id);
  }

  onBlur(): void {
    // Laisse le clic sur une option se produire avant de fermer.
    setTimeout(() => this.open.set(false), 150);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  /** Infobulle explicative (non bloquante). */
  tooltip(s: Service): string {
    const n = s.associatedOfferingsCount ?? 0;
    return n > 1
      ? `${n} offrandes sont déjà enregistrées pour ce culte. Vous pouvez en ajouter une nouvelle.`
      : 'Une ou plusieurs offrandes sont déjà enregistrées pour ce culte. Vous pouvez en ajouter une nouvelle.';
  }

  /** Libellé lisible d'un culte : date · titre · site · statut. */
  labelOf(s: Service): string {
    const date = (s as any).formattedDate
      || (s.date ? new Date(s.date).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : '');
    return [date, s.title, (s as any).siteName, (s as any).statusLabel].filter(Boolean).join(' · ');
  }
}
