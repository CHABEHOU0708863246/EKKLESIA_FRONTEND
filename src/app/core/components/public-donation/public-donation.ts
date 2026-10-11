// src/app/core/components/public-donation/public-donation.ts
import { Component, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Donations } from '../../services/Donation/donations';
import { PublicCulteDonation } from '../../models/Donations/donation.model';

/**
 * Page PUBLIQUE de don d'un culte (Live Stream).
 * Atterrissage après scan du QR code : montant + coordonnées → GeniusPay.
 */
@Component({
  selector: 'app-public-donation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './public-donation.html',
  styleUrl: './public-donation.scss',
})
export class PublicDonation implements OnInit {
  private readonly route: ActivatedRoute;
  private readonly fb: FormBuilder;
  private readonly donations: Donations;

  culte = signal<PublicCulteDonation | null>(null);
  loading = signal(true);
  submitting = signal(false);
  error = signal<string | null>(null);

  form: FormGroup;
  readonly methods = [
    { value: 'wave', label: 'Wave' },
    { value: 'orange_money', label: 'Orange Money' },
    { value: 'mtn_money', label: 'MTN Money' },
    { value: 'card', label: 'Carte bancaire' },
  ];

  constructor(
    route: ActivatedRoute,
    fb: FormBuilder,
    donations: Donations,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.route = route;
    this.fb = fb;
    this.donations = donations;
    this.form = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
      currency: ['XOF'],
      donorName: [''],
      donorPhone: ['', [Validators.pattern(/^[0-9+\s]{8,20}$/)]],
      donorEmail: ['', [Validators.email]],
      paymentMethod: ['wave', Validators.required],
      message: [''],
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const serviceId = this.route.snapshot.paramMap.get('serviceId') ?? '';
    if (!serviceId) {
      this.error.set('Culte invalide.');
      this.loading.set(false);
      return;
    }
    this.donations.getCulte(serviceId).subscribe({
      next: (c) => {
        this.culte.set(c);
        this.loading.set(false);
        if (c.suggestedAmounts?.length) this.form.patchValue({ amount: c.suggestedAmounts[1] ?? c.suggestedAmounts[0] });
      },
      error: () => {
        this.error.set("Ce culte est introuvable ou n'accepte plus de dons.");
        this.loading.set(false);
      },
    });
  }

  pickAmount(value: number): void {
    this.form.patchValue({ amount: value });
    this.form.get('amount')?.markAsDirty();
  }

  isAmountSelected(value: number): boolean {
    return Number(this.form.get('amount')?.value) === value;
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const serviceId = this.culte()?.serviceId;
    if (!serviceId) return;

    this.submitting.set(true);
    this.error.set(null);

    const v = this.form.value;
    this.donations
      .createIntent(serviceId, {
        amount: Number(v.amount),
        currency: v.currency || 'XOF',
        donorName: v.donorName || undefined,
        donorPhone: v.donorPhone || undefined,
        donorEmail: v.donorEmail || undefined,
        paymentMethod: v.paymentMethod,
        message: v.message || undefined,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          if (res.success && (res.checkoutUrl || res.paymentUrl)) {
            // Redirection vers le guichet de paiement sécurisé GeniusPay.
            window.location.href = (res.checkoutUrl || res.paymentUrl) as string;
          } else {
            this.error.set(res.errorMessage || "Impossible d'initier le paiement.");
          }
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err?.error?.errorMessage || 'Une erreur est survenue.');
        },
      });
  }

  formatDate(date?: string | null): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
