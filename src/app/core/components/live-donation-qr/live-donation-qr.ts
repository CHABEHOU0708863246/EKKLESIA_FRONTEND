// src/app/core/components/live-donation-qr/live-donation-qr.ts
import {
  Component,
  Inject,
  Input,
  OnChanges,
  OnInit,
  PLATFORM_ID,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import QRCode from 'qrcode';

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
export class LiveDonationQrComponent implements OnChanges, OnInit {
  @Input({ required: true }) serviceId = '';
  @Input() title = '';
  @Input() subtitle = 'Scannez pour donner';
  @Input() message = 'Offrande & dîmes en ligne';
  /** Mode transparent (source navigateur OBS : pas de fond, pas de bordure). */
  @Input() transparent = false;

  readonly qrDataUrl = signal<string | null>(null);
  readonly qrError = signal(false);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    // Génère aussi à l'init : couvre le cas d'hydratation où ngOnChanges
    // ne se redéclenche pas côté client.
    void this.generateQr();
  }

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
      // Interop CJS/ESM : l'API peut être sur le namespace ou sous `.default`.
      const mod: any = QRCode as any;
      const lib = typeof mod?.toString === 'function' ? mod : (mod?.default ?? mod);
      // SVG (pur JS) : indépendant de canvas et du build « navigateur ».
      const svg = await lib.toString(this.donationUrl, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 320,
        color: { dark: '#0c2340', light: '#ffffff' },
      });
      this.qrDataUrl.set('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
      this.qrError.set(false);
    } catch (e) {
      console.error('❌ Génération du QR échouée', e, this.donationUrl);
      this.qrError.set(true);
    }
  }
}
