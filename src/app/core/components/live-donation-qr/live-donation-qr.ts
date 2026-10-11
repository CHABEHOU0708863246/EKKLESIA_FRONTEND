// src/app/core/components/live-donation-qr/live-donation-qr.ts
import {
  Component,
  Inject,
  Input,
  OnChanges,
  PLATFORM_ID,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

/**
 * Bloc QR code de don pour un culte (Live Stream).
 * Génère le QR côté navigateur (lib `qrcode`) pointant vers la page de don
 * publique pré-remplie avec l'ID du culte. Utilisable :
 *  - en incrustation sur le lecteur vidéo ;
 *  - en page transparente comme source navigateur OBS Studio.
 */
@Component({
  selector: 'app-live-donation-qr',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-donation-qr.html',
  styleUrl: './live-donation-qr.scss',
})
export class LiveDonationQrComponent implements OnChanges {
  @Input({ required: true }) serviceId = '';
  @Input() title = '';
  @Input() subtitle = 'Scannez pour donner';
  @Input() message = 'Offrande & dîmes en ligne';
  /** Mode transparent (source navigateur OBS : pas de fond, pas de bordure). */
  @Input() transparent = false;

  readonly qrDataUrl = signal<string | null>(null);
  readonly qrError = signal(false);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['serviceId']) void this.generateQr();
  }

  /** URL publique de don encodée dans le QR (pré-remplie avec le culte). */
  get donationUrl(): string {
    const origin = isPlatformBrowser(this.platformId) ? window.location.origin : '';
    return `${origin}/don/culte/${this.serviceId}`;
  }

  private async generateQr(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.serviceId) return;
    try {
      const QRCode = await import('qrcode');
      const url = await QRCode.toDataURL(this.donationUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 320,
        color: { dark: '#0c2340', light: '#ffffff' },
      });
      this.qrDataUrl.set(url);
      this.qrError.set(false);
    } catch {
      this.qrError.set(true);
    }
  }
}
