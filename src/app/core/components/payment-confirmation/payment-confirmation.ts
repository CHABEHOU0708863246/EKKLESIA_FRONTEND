import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, interval, startWith, switchMap, takeUntil, take } from 'rxjs';
import { PublicRegistrationService } from '../../services/Event/public-registration-service';
import { PaymentReceiptDto } from '../../models/Events/event.model';

type ConfirmationStatus = 'checking' | 'paid' | 'pending' | 'failed' | 'timeout';

@Component({
  selector: 'app-payment-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-confirmation.html',
  styleUrl: './payment-confirmation.scss',
})
export class PaymentConfirmation implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private registrationService = inject(PublicRegistrationService);

  /**
   * ⚠️ Deux sujets distincts : `destroy$` pour le cycle de vie du composant,
   * `stopPolling$` pour arrêter la boucle sans empêcher un nouveau départ.
   * Les confondre rendait retryCheck() aléatoire.
   */
  private destroy$ = new Subject<void>();
  private stopPolling$ = new Subject<void>();

  status = signal<ConfirmationStatus>('checking');
  attendeeId = '';

  // ── Reçu ──
  receipt = signal<PaymentReceiptDto | null>(null);
  loadingReceipt = signal(false);
  resending = signal(false);
  resendMessage = signal<string | null>(null);

  private pollCount = 0;
  private readonly MAX_POLLS = 40;   // 40 × 3 s = 2 minutes

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('attendeeId');
    if (!id) {
      this.status.set('failed');
      return;
    }
    this.attendeeId = id;
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling$.next();
    this.stopPolling$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ══════════════════════════════════════════════════════════
  // POLLING DU STATUT
  // ══════════════════════════════════════════════════════════

  private startPolling(): void {
    this.pollCount = 0;
    this.status.set('checking');

    interval(3000).pipe(
      startWith(0),
      switchMap(() => this.registrationService.getRegistrationStatus(this.attendeeId)),
      takeUntil(this.stopPolling$),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
        this.pollCount++;

        if (res.isPaid) {
          this.status.set('paid');
          this.stopPolling$.next();
          this.loadReceipt();
          return;
        }

        // ⚠️ 'Expired' n'est PAS un échec définitif : le webhook peut encore
        // arriver, ou la réconciliation rattraper le paiement. On ne dit jamais
        // « échec » à quelqu'un qui a peut-être été débité.
        if (res.paymentStatus === 'Failed' || res.paymentStatus === 'Cancelled') {
          this.status.set('failed');
          this.stopPolling$.next();
          return;
        }

        if (res.paymentStatus === 'Expired' || this.pollCount >= this.MAX_POLLS) {
          this.status.set('timeout');
          this.stopPolling$.next();
          // Le reçu existe peut-être déjà malgré le statut affiché
          this.loadReceipt();
          return;
        }

        this.status.set('pending');
      },
      error: () => {
        this.status.set('timeout');
        this.stopPolling$.next();
      },
    });
  }

  retryCheck(): void {
    this.receipt.set(null);
    this.resendMessage.set(null);
    this.startPolling();
  }

  // ══════════════════════════════════════════════════════════
  // REÇU
  // ══════════════════════════════════════════════════════════

  /**
   * Un 404 signifie simplement « pas encore de reçu » — ce n'est pas une erreur
   * à afficher. Le participant recevra le sien par email dans tous les cas.
   */
  private loadReceipt(): void {
    this.loadingReceipt.set(true);

    this.registrationService.getReceipt(this.attendeeId)
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.receipt.set(r);
          this.loadingReceipt.set(false);
          // Un reçu existe → le paiement est bel et bien confirmé
          if (this.status() !== 'paid') this.status.set('paid');
        },
        error: () => {
          this.receipt.set(null);
          this.loadingReceipt.set(false);
        },
      });
  }

  downloadReceipt(): void {
    const r = this.receipt();
    if (r?.downloadUrl) window.open(r.downloadUrl, '_blank');
  }

  resendReceipt(): void {
    if (this.resending()) return;

    this.resending.set(true);
    this.resendMessage.set(null);

    this.registrationService.resendReceipt(this.attendeeId)
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.resending.set(false);
          this.resendMessage.set(
            res.success
              ? 'Reçu renvoyé. Vérifiez votre boîte mail (et vos spams).'
              : "Renvoi impossible : aucune adresse email n'est associée à cette inscription."
          );
        },
        error: () => {
          this.resending.set(false);
          this.resendMessage.set('Renvoi impossible pour le moment. Réessayez dans quelques instants.');
        },
      });
  }
}
