import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl, FormArray, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

/** Une étape du guide affiché en tête de formulaire. */
export interface GuideStep {
  text: string;
  icon?: string;
  tone?: 'success' | 'info' | 'warning' | 'danger' | 'primary';
}

/**
 * Bandeau d'instructions + barre de progression réutilisable pour les formulaires.
 *
 * Usage :
 *   <app-form-guide [steps]="guideSteps" [form]="form"></app-form-guide>
 *
 * La progression est calculée automatiquement à partir des champs obligatoires
 * (`Validators.required`) présents dans le FormGroup, y compris les groupes et
 * tableaux imbriqués.
 */
@Component({
  selector: 'app-form-guide',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="fg-card fg-instructions">
      <div class="fg-head">
        <i class="bx bx-info-circle"></i>
        <span>{{ title }}</span>
      </div>
      <ul class="fg-list">
        @for (s of steps; track s) {
          <li class="fg-item" [class]="'fg-item--' + (s.tone || 'info')">
            <span class="fg-ico"><i class="bx" [ngClass]="s.icon || 'bx-check'"></i></span>
            <span class="fg-text">{{ s.text }}</span>
          </li>
        }
      </ul>
    </section>

    @if (form) {
      <section class="fg-card fg-progress">
        <div class="fg-progress-head">
          <strong>Progression</strong>
          <span class="fg-pct" [class.is-done]="progress() === 100">{{ progress() }}%</span>
        </div>
        <div class="fg-bar"><div class="fg-bar-fill" [style.width.%]="progress()"></div></div>
        <p class="fg-hint">
          @if (progress() === 100) {
            <i class="bx bx-check-circle"></i> Tous les champs obligatoires sont remplis.
          } @else {
            Complétez tous les champs requis ({{ filled() }}/{{ total() }}).
          }
        </p>
      </section>
    }
  `,
  styles: [`
    :host { display: block; margin-bottom: 16px; }
    .fg-card {
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #e8eaf1);
      border-radius: 14px;
      padding: 16px 18px;
      margin-bottom: 12px;
    }
    .fg-head {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700; font-size: 15px; color: var(--color-text, #1f2333);
      margin-bottom: 12px;
    }
    .fg-head i { color: #6C5CE7; font-size: 18px; }
    .fg-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .fg-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; line-height: 1.45; color: var(--color-text, #2b2f42); }
    .fg-ico {
      flex: 0 0 30px; width: 30px; height: 30px; border-radius: 9px;
      display: inline-flex; align-items: center; justify-content: center; font-size: 16px;
    }
    .fg-item--success .fg-ico { background: rgba(0,184,148,.14); color: #00B894; }
    .fg-item--info .fg-ico { background: rgba(108,92,231,.14); color: #6C5CE7; }
    .fg-item--warning .fg-ico { background: rgba(253,203,110,.18); color: #B7791F; }
    .fg-item--danger .fg-ico { background: rgba(225,112,85,.16); color: #E17055; }
    .fg-item--primary .fg-ico { background: rgba(9,132,227,.14); color: #0984E3; }
    .fg-progress-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .fg-pct { font-weight: 700; color: #6C5CE7; }
    .fg-pct.is-done { color: #00B894; }
    .fg-bar { height: 8px; border-radius: 999px; background: #eef0f7; overflow: hidden; }
    .fg-bar-fill { height: 100%; background: linear-gradient(90deg, #6C5CE7, #0984E3); border-radius: 999px; transition: width .25s ease; }
    .fg-hint { margin: 8px 0 0; font-size: 12.5px; color: var(--color-muted, #8d93a8); display: flex; align-items: center; gap: 6px; }
    .fg-hint i { color: #00B894; }
  `],
})
export class FormGuide implements OnInit, OnDestroy {
  @Input() title = 'Instructions';
  @Input() steps: GuideStep[] = [];

  progress = signal(0);
  filled = signal(0);
  total = signal(0);

  private _form: FormGroup | null = null;
  private sub?: Subscription;

  @Input()
  set form(value: FormGroup | null) {
    this._form = value;
    this.sub?.unsubscribe();
    this.sub = undefined;
    if (value) {
      this.recompute(value);
      this.sub = value.valueChanges.subscribe(() => this.recompute(value));
    }
  }
  get form(): FormGroup | null {
    return this._form;
  }

  ngOnInit(): void {
    if (this._form) this.recompute(this._form);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private recompute(form: FormGroup): void {
    const required: AbstractControl[] = [];
    this.collectRequired(form, required);

    const total = required.length;
    const filled = required.filter((c) => this.isFilled(c)).length;
    this.total.set(total);
    this.filled.set(filled);
    this.progress.set(total === 0 ? 100 : Math.round((filled / total) * 100));
  }

  private collectRequired(control: AbstractControl, acc: AbstractControl[]): void {
    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach((c) => this.collectRequired(c, acc));
      return;
    }
    if (control instanceof FormArray) {
      if (control.hasValidator(Validators.required) || control.hasValidator(Validators.requiredTrue) || control.hasValidator(Validators.minLength(1))) {
        acc.push(control);
      }
      control.controls.forEach((c) => this.collectRequired(c, acc));
      return;
    }
    if (control.hasValidator(Validators.required) || control.hasValidator(Validators.requiredTrue)) {
      acc.push(control);
    }
  }

  private isFilled(control: AbstractControl): boolean {
    if (control.disabled) return true;
    const v = control.value;
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'boolean') return v === true;
    return true;
  }
}
