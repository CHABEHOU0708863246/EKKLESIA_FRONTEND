// src/app/core/components/member-id-card/member-id-card.ts
import { Component, Inject, Input, OnChanges, PLATFORM_ID, SimpleChanges, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { Member, memberStatusLabel } from '../../models/Members/member.model';
import { AuthImageDirective } from '../../directives/auth-image.directive';
import { environment } from '../../../../environments/environment';

/**
 * Carte d'identité ecclésiastique premium (recto / verso).
 * Design carte physique : coins arrondis, bordure dorée, ombre portée,
 * identité MIAV, photo (avatar par défaut), matricule, statut, dates,
 * QR code de vérification. Impression/PDF via window.print().
 */
@Component({
  selector: 'app-member-id-card',
  standalone: true,
  imports: [CommonModule, AuthImageDirective],
  templateUrl: './member-id-card.html',
  styleUrl: './member-id-card.scss',
})
export class MemberIdCardComponent implements OnChanges {
  @Input({ required: true }) member!: Member;
  @Input() churchName = 'Mission Internationale Arbre de Vie';

  readonly qrDataUrl = signal<string | null>(null);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['member'] && this.member) {
      void this.generateQr();
    }
  }

  // ── Identité ──
  get fullName(): string {
    return (this.member?.fullName || `${this.member?.firstName ?? ''} ${this.member?.lastName ?? ''}`).trim();
  }

  get initials(): string {
    const f = this.member?.firstName?.charAt(0) ?? '';
    const l = this.member?.lastName?.charAt(0) ?? '';
    return (f + l).toUpperCase() || '?';
  }

  get photoSrc(): string {
    const p = this.member?.photoUrl;
    if (!p) return '';
    if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:')) return p;
    return `${environment.apiUrl}/api/v1/Member/photo/${p}`;
  }

  /** Matricule lisible dérivé de l'identifiant technique. */
  get matricule(): string {
    const id = this.member?.id ?? '';
    if (!id) return '—';
    const year = this.registrationYear;
    return `MIAV-${year}-${id.slice(-6).toUpperCase()}`;
  }

  private get registrationYear(): number {
    const raw = (this.member as any)?.registrationDate
      ?? (this.member as any)?.adhesionDate
      ?? this.member?.createdAt;
    const d = raw ? new Date(raw) : new Date();
    return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  }

  get statusLabel(): string {
    return memberStatusLabel(this.member?.status);
  }

  get adhesionDate(): string {
    return this.formatDate((this.member as any)?.adhesionDate ?? this.member?.registrationDate);
  }

  get birthDate(): string {
    return this.formatDate(this.member?.dateOfBirth);
  }

  get siteName(): string {
    return this.member?.siteName || 'Église mère (siège)';
  }

  /** URL encodée dans le QR code (vérification de l'appartenance). */
  get verificationUrl(): string {
    return `${environment.apiUrl}/api/v1/Member/verify/${this.member?.id ?? ''}`;
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private async generateQr(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      // Import paresseux : le QR n'est généré que côté navigateur.
      const QRCode = await import('qrcode');
      const url = await QRCode.toDataURL(this.verificationUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 240,
        color: { dark: '#0f2a47', light: '#ffffff' },
      });
      this.qrDataUrl.set(url);
    } catch {
      this.qrDataUrl.set(null);
    }
  }

  print(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const body = document.body;
    body.classList.add('idcard-printing');
    setTimeout(() => {
      window.print();
      setTimeout(() => body.classList.remove('idcard-printing'), 500);
    }, 60);
  }
}
