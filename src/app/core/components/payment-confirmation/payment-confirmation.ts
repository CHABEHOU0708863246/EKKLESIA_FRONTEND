import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, interval, startWith, switchMap, takeUntil } from 'rxjs';
import { PublicRegistrationService } from '../../services/Event/public-registration-service';

@Component({
  selector: 'app-payment-confirmation',
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-confirmation.html',
  styleUrl: './payment-confirmation.scss',
})
export class PaymentConfirmation implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private registrationService = inject(PublicRegistrationService);

  status = signal<'checking' | 'paid' | 'pending' | 'failed' | 'timeout'>('checking'); // ✅ AJOUT 'timeout'
  attendeeId!: string;
  private pollCount = 0;
  private readonly MAX_POLLS = 40; // ✅ NOUVEAU — 40 x 3s = 2 minutes avant d'arrêter le polling automatique

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('attendeeId');
    if (!id) {
      this.status.set('failed');
      return;
    }
    this.attendeeId = id;

    interval(3000).pipe(
      startWith(0),
      switchMap(() => this.registrationService.getRegistrationStatus(this.attendeeId)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
        this.pollCount++;

        if (res.isPaid) {
          this.status.set('paid');
          this.destroy$.next();
        } else if (res.paymentStatus === 'Failed' || res.paymentStatus === 'Cancelled' || res.paymentStatus === 'Expired') {
          this.status.set('failed');
          this.destroy$.next();
        } else if (this.pollCount >= this.MAX_POLLS) {
          // ✅ NOUVEAU — après 2 min sans confirmation, on arrête le polling
          // automatique et on laisse l'utilisateur relancer manuellement,
          // au lieu de tourner indéfiniment en arrière-plan.
          this.status.set('timeout');
          this.destroy$.next();
        } else {
          this.status.set('pending');
        }
      },
      error: () => this.status.set('failed'),
    });
  }

  // ✅ NOUVEAU — permet à l'utilisateur de relancer la vérification manuellement
  retryCheck(): void {
    this.status.set('checking');
    this.pollCount = 0;
    this.ngOnInit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
