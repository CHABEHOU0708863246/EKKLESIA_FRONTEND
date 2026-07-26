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

  status = signal<'checking' | 'paid' | 'pending' | 'failed'>('checking');
  attendeeId!: string;

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('attendeeId');
    if (!id) {
      this.status.set('failed');
      return;
    }
    this.attendeeId = id;

    // ✅ Ne JAMAIS faire confiance à un simple ?success=true dans l'URL —
    // on interroge le vrai statut côté backend, en polling toutes les 3s,
    // jusqu'à confirmation (le webhook peut arriver après le retour de
    // l'utilisateur sur cette page).
    interval(3000).pipe(
      startWith(0),
      switchMap(() => this.registrationService.getRegistrationStatus(this.attendeeId)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
        if (res.isPaid) {
          this.status.set('paid');
          this.destroy$.next(); // stoppe le polling une fois confirmé
        } else if (res.paymentStatus === 'Failed' || res.paymentStatus === 'Cancelled' || res.paymentStatus === 'Expired') {
          this.status.set('failed');
          this.destroy$.next();
        } else {
          this.status.set('pending');
        }
      },
      error: () => this.status.set('failed'),
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
