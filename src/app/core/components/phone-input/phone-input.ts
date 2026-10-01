import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  DEFAULT_PHONE_ISO,
  PHONE_COUNTRIES,
  PhoneCountry,
  findPhoneCountry,
  formatReadablePhone,
  splitE164,
  toE164,
} from '../../utils/phone.util';

/**
 * Champ téléphone réutilisable : sélecteur de pays (drapeau + indicatif),
 * recherche par nom de pays, validation par pays, stockage E.164, affichage
 * lisible. S'utilise avec `formControlName`. (RG-P2-5)
 */
@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PhoneInput), multi: true }],
  template: `
    <div class="pi-field" [class.pi-field--disabled]="disabled()">
      @if (label) { <label class="pi-label">{{ label }}</label> }
      <div class="pi-row">
        <div class="pi-country-wrap">
          <select class="pi-country" [ngModel]="iso()" (ngModelChange)="onCountryChange($event)"
                  [disabled]="disabled()" [title]="selectedName()" aria-label="Indicatif du pays">
            @for (c of countries(); track c.iso) {
              <option [value]="c.iso">{{ c.flag }} {{ c.dialCode }}</option>
            }
          </select>
          <i class="pi-caret bx bx-chevron-down"></i>
        </div>
        <input class="pi-number" type="tel" [ngModel]="national()" (ngModelChange)="onNumberChange($event)"
               [placeholder]="placeholder" [disabled]="disabled()" autocomplete="tel" />
      </div>
      @if (error()) {
        <p class="pi-error">{{ error() }}</p>
      } @else if (e164()) {
        <p class="pi-hint">{{ display() }}</p>
      }
    </div>
  `,
  styles: [`
    .pi-field { width: 100%; }
    .pi-label { display: block; font-weight: 600; margin-bottom: 6px; }
    .pi-row {
      display: flex; align-items: stretch; width: 100%;
      border: 1px solid var(--ekk-border, #d7dbe0); border-radius: 7px;
      background: #fff; overflow: hidden;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .pi-row:focus-within {
      border-color: var(--ekk-violet-600, #5b3a8e);
      box-shadow: 0 0 0 3px rgba(91, 58, 142, .14);
    }
    .pi-country-wrap { position: relative; display: flex; flex: 0 0 auto; }
    .pi-country {
      appearance: none; -webkit-appearance: none; border: 0; margin: 0;
      height: 38px; line-height: 38px; padding: 0 24px 0 11px;
      font-size: 14px; font-family: inherit; color: var(--ekk-ink, #1f2430);
      background: var(--ekk-surface, #f6f7fb); cursor: pointer;
      border-right: 1px solid var(--ekk-border, #e2e6ee);
    }
    .pi-country:focus { outline: none; }
    .pi-caret {
      position: absolute; right: 5px; top: 50%; transform: translateY(-50%);
      font-size: 15px; color: var(--ekk-ink-muted, #8a90a0); pointer-events: none;
    }
    .pi-number {
      flex: 1 1 auto; min-width: 0; border: 0; outline: none;
      height: 38px; padding: 0 12px; font-size: 14px; font-family: inherit;
      color: var(--ekk-ink, #1f2430); background: transparent;
    }
    .pi-number::placeholder { color: #a3a9b8; }
    .pi-field--disabled .pi-row { opacity: .6; }
    .pi-error { margin: 6px 0 0; color: #e04646; font-size: 12.5px; }
    .pi-hint { margin: 6px 0 0; color: #64748b; font-size: 12.5px; }
  `],
})
export class PhoneInput implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '07 00 00 00 00';

  countries = signal<PhoneCountry[]>(PHONE_COUNTRIES);
  iso = signal<string>(DEFAULT_PHONE_ISO);
  national = signal<string>('');
  e164 = signal<string | null>(null);
  error = signal<string>('');
  disabled = signal(false);

  private onChangeFn: (value: string | null) => void = () => {};
  private onTouchedFn: () => void = () => {};

  writeValue(value: string | null): void {
    if (!value) {
      this.national.set('');
      this.e164.set(null);
      this.error.set('');
      return;
    }
    const { iso, national } = splitE164(value);
    this.iso.set(iso);
    this.national.set(national);
    this.e164.set(value.startsWith('+') ? value : null);
  }

  registerOnChange(fn: (value: string | null) => void): void { this.onChangeFn = fn; }
  registerOnTouched(fn: () => void): void { this.onTouchedFn = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }

  onCountryChange(iso: string): void {
    this.iso.set(iso);
    this.recompute();
  }

  onNumberChange(value: string): void {
    this.national.set(value);
    this.recompute();
  }

  display(): string {
    return formatReadablePhone(this.e164());
  }

  /** Nom complet du pays sélectionné (info-bulle du sélecteur). */
  selectedName(): string {
    const c = findPhoneCountry(this.iso());
    return c ? `${c.flag} ${c.dialCode} · ${c.name}` : '';
  }

  private recompute(): void {
    this.onTouchedFn();
    const raw = this.national().trim();
    if (!raw) {
      this.error.set('');
      this.e164.set(null);
      this.onChangeFn(null);
      return;
    }
    const res = toE164(raw, this.iso());
    if (!res.ok) {
      this.error.set(res.reason ?? 'Numéro invalide.');
      this.e164.set(null);
      this.onChangeFn(null);
      return;
    }
    this.error.set('');
    this.e164.set(res.e164!);
    this.onChangeFn(res.e164!);
  }
}
