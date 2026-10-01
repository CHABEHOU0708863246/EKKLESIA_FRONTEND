import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { MoneyService } from '../../services/Money/money.service';

/**
 * Affiche un montant avec sa devise d'origine ET, si elle diffère du FCFA,
 * sa contre-valeur en FCFA (XOF). Ex. « 1234 EUR ≈ 809 090 FCFA ». RG-CURR-04.
 */
@Component({
  selector: 'app-dual-amount',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="da">
      <span class="da-main">{{ amount | number:'1.0-3' }} {{ currency || 'XOF' }}</span>
      @if (money.isForeign(currency)) {
        <small class="da-xof">≈ {{ money.xof(amount, currency) | number:'1.0-0' }} FCFA</small>
      }
    </span>
  `,
  styles: [`
    .da { display: inline-flex; flex-direction: column; line-height: 1.25; }
    .da-main { font-weight: inherit; }
    .da-xof { color: #0e9f6e; font-weight: 600; font-size: 0.82em; }
  `],
})
export class DualAmount {
  @Input() amount: number | null | undefined = 0;
  @Input() currency: string | null | undefined = 'XOF';

  readonly money = inject(MoneyService);

  constructor() {
    this.money.load();
  }
}
