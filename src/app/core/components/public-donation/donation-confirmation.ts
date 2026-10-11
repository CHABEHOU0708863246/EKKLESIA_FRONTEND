// src/app/core/components/public-donation/donation-confirmation.ts
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { Donations } from '../../services/Donation/donations';
import { DonationStatus } from '../../models/Donations/donation.model';

type ViewState = 'loading' | 'pending' | 'paid' | 'failed' | 'unknown';

/**
 * Page PUBLIQUE de confirmation de don (retour GeniusPay).
 * Affiche le statut EN TEMPS RÉEL par référence / ID d'intention (polling).
 * Utilisable avec ?donation={intentId} ou ?ref={reference}.
 */
@Component({
  selector: 'app-donation-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './donation-confirmation.html',
  styleUrl: './donation-confirmation.scss',
})
export class DonationConfirmation implements OnInit, OnDestroy {
  state = signal<ViewState>('loading');
  status = signal<DonationStatus | null>(null);
  error = signal<string | null>(null);

  private intentId: string | null = null;
  private reference: string | null = null;
  private timer: any = null;
  private attempts = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly donations: Donations,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const qp = this.route.snapshot.queryParamMap;
    this.intentId = qp.get('donation');
    this.reference = qp.get('ref') ?? qp.get('reference');

    if (!this.intentId && !this.reference) {
      this.state.set('unknown');
      this.error.set('Référence de don manquante.');
      return;
    }

    this.poll();
    this.timer = setInterval(() => this.poll(), 4000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private poll(): void {
    this.attempts++;
    const req$ = this.intentId
      ? this.donations.getStatusById(this.intentId)
      : this.donations.getStatus(this.reference as string);

    req$.subscribe({
      next: (s) => {
        this.status.set(s);
        const st = (s.status || '').toLowerCase();
        if (st === 'paid') {
          this.state.set('paid');
          this.stop();
        } else if (st === 'failed' || st === 'cancelled') {
          this.state.set('failed');
          this.stop();
        } else {
          this.state.set('pending');
        }
      },
      error: () => {
        // 404 tant que le webhook n'a pas encore créé/maj l'intention.
        if (this.attempts >= 30) {
          this.state.set('unknown');
          this.error.set('Don introuvable. Vérifiez la référence.');
          this.stop();
        } else {
          this.state.set('pending');
        }
      },
    });
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  formatAmount(amount?: number, currency?: string): string {
    const n = Number(amount ?? 0).toLocaleString('fr-FR');
    return `${n} ${currency || 'XOF'}`;
  }

  formatDate(date?: string | null): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
