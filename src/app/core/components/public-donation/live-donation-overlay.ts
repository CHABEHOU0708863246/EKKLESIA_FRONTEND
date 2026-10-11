// src/app/core/components/public-donation/live-donation-overlay.ts
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { LiveDonationQrComponent } from '../live-donation-qr/live-donation-qr';
import { Donations } from '../../services/Donation/donations';
import { DonationNotification } from '../../models/Donations/donation.model';

interface Toast {
  id: number;
  donorName: string;
  amount: number;
  currency: string;
}

/**
 * Page OVERLAY pour OBS Studio / incrustation navigateur.
 * Fond TRANSPARENT : QR de don + notifications « remerciement » en direct.
 * URL à ajouter comme source navigateur : {origine}/live/overlay/{serviceId}
 */
@Component({
  selector: 'app-live-donation-overlay',
  standalone: true,
  imports: [CommonModule, LiveDonationQrComponent],
  templateUrl: './live-donation-overlay.html',
  styleUrl: './live-donation-overlay.scss',
})
export class LiveDonationOverlay implements OnInit, OnDestroy {
  serviceId = '';
  title = '';

  toasts = signal<Toast[]>([]);

  private since: string | null = null;
  private timer: any = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly donations: Donations,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // Fond TRANSPARENT pour OBS (source navigateur).
    document.body.classList.add('miav-live-overlay');
    this.serviceId = this.route.snapshot.paramMap.get('serviceId') ?? '';

    // Première borne : maintenant (on n'affiche que les nouveaux dons).
    this.since = new Date().toISOString();
    this.timer = setInterval(() => this.pollNotifications(), 8000);
    setTimeout(() => this.pollNotifications(), 3000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.remove('miav-live-overlay');
    }
  }

  private pollNotifications(): void {
    if (!this.serviceId) return;
    this.donations.getNotifications(this.serviceId, this.since ?? undefined).subscribe({
      next: (items) => {
        if (!items?.length) return;
        this.since = new Date().toISOString();
        for (const n of items) this.pushToast(n);
      },
      error: () => { /* silencieux : source OBS */ },
    });
  }

  private pushToast(n: DonationNotification): void {
    const toast: Toast = {
      id: Date.now() + Math.random(),
      donorName: n.donorName || 'Anonyme',
      amount: n.amount,
      currency: n.currency,
    };
    this.toasts.update((list) => [...list, toast]);
    setTimeout(() => {
      this.toasts.update((list) => list.filter((t) => t.id !== toast.id));
    }, 7000);
  }
}
