// src/app/features/dashboard/finances/offerings/offering-by-member/offering-by-member.component.ts

import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Members } from '../../../../../core/services/Members/members';
import { Member } from '../../../../../core/models/Members/member.model';
import { Offering, OfferingSummaryDto, OfferingUtils } from '../../../../../core/models/Finances/offering.model';
import { OfferingTypeLabels, OfferingTypeIcons, OfferingTypeColors } from '../../../../../core/models/Finances/offering.model';
import { Offerings } from '../../../../../core/services/Finances/offerings';
import { AuthImageDirective } from '../../../../../core/directives/auth-image.directive';

@Component({
  selector: 'app-offering-by-member',
  standalone: true,
  imports: [CommonModule, RouterModule, AuthImageDirective],
  templateUrl: './offering-by-member.html',
  styleUrls: ['./offering-by-member.scss'],
})
export class OfferingByMember implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private offeringsService = inject(Offerings);
  private memberService = inject(Members);
  private router = inject(Router);
  // ── État ──
  selectedMember = signal<Member | null>(null);
  summary = signal<OfferingSummaryDto | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // ── Liste déroulante des membres + filtre texte (utile au-delà de 500) ──
  members = signal<Member[]>([]);
  loadingMembers = signal(false);
  selectedMemberId = signal<string>('');
  filterTerm = signal('');

  private readonly filter$ = new Subject<string>();
  private readonly maxMembers = 500;

  // ── Exposé des utilitaires ──
  getTypeLabel = OfferingUtils.getTypeLabel;
  getTypeIcon = OfferingUtils.getTypeIcon;
  getTypeColor = OfferingUtils.getTypeColor;
  getFormattedDate = OfferingUtils.getFormattedDate;
  getFormattedCurrency = OfferingUtils.getFormattedCurrency;
  getStatusLabel = OfferingUtils.getStatusLabel;
  getStatusColor = OfferingUtils.getStatusColor;
  getPaymentMethodLabel = OfferingUtils.getPaymentMethodLabel;

  // ── Calculs ──
  hasSummary = computed(() => this.summary() !== null);
  totalGiven = computed(() => this.summary()?.totalGiven || 0);
  totalOfferings = computed(() => this.summary()?.totalOfferings || 0);
  titheTotal = computed(() => this.summary()?.titheTotal || 0);
  offeringTotal = computed(() => this.summary()?.offeringTotal || 0);
  averageMonthly = computed(() => this.summary()?.averageMonthly || 0);

  // ── Types d'offrande pour l'affichage ──
  typeKeys = Object.keys(OfferingTypeLabels) as Array<keyof typeof OfferingTypeLabels>;
  readonly Object = Object;

  // ── Couleurs pour les types ──
  getTypeColorClass(type: string): string {
    const colorMap: Record<string, string> = {
      'Tithe': 'primary',
      'SundayOffering': 'success',
      'SpecialOffering': 'warning',
      'BuildingFund': 'info',
      'Mission': 'purple',
      'Seed': 'teal',
      'Thanksgiving': 'orange',
      'Other': 'secondary'
    };
    return `obm-type-${colorMap[type] || 'secondary'}`;
  }

  constructor() { }

  ngOnInit(): void {
    this.loadMembers('');
    this.filter$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => this.loadMembers(term));
  }

  getMemberPhotoUrl(member: Member): string {
    // ⚠️ Photo de MEMBRE → endpoint `/Member/photo/{id}` (et non `/User/photo`).
    return this.memberService.getMemberPhotoUrl(member.photoUrl);
  }

onImageError(event: Event): void {
  (event.target as HTMLImageElement).style.display = 'none';
}

  sortedMonths = computed(() => {
    const byMonth = this.summary()?.byMonth || {};
    return Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0])) // Trie par ordre chronologique (YYYY-MM)
      .map(([key, value]) => ({ key, value }));
  });

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────────────────────────
  // LISTE DÉROULANTE DES MEMBRES
  // ──────────────────────────────────────────────────────────────

  private loadMembers(term: string): void {
    this.loadingMembers.set(true);
    const params: any = { page: 1, pageSize: this.maxMembers, sortBy: 'lastName', sortOrder: 'asc' };
    if (term) params.fullName = term;

    this.memberService
      .getMembers(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const items = response?.items ?? response?.data?.items ?? [];
          const sorted = (items as Member[])
            .slice()
            .sort((a, b) => this.getMemberFullName(a).localeCompare(this.getMemberFullName(b), 'fr'));

          // Conserver le membre sélectionné dans la liste même s'il sort du filtre.
          const selected = this.selectedMember();
          if (selected && !sorted.some((m) => m.id === selected.id)) {
            sorted.unshift(selected);
          }
          this.members.set(sorted);
          this.loadingMembers.set(false);
        },
        error: () => {
          this.members.set([]);
          this.loadingMembers.set(false);
        },
      });
  }

  /** Filtre texte : relance la recherche serveur (gère les églises > 500 membres). */
  onFilterInput(value: string): void {
    this.filterTerm.set(value);
    this.filter$.next(value.trim());
  }

  clearFilter(): void {
    if (!this.filterTerm()) return;
    this.filterTerm.set('');
    this.filter$.next('');
  }

  /** Sélection dans la liste déroulante : charge immédiatement le résumé. */
  onMemberChange(id: string): void {
    this.selectedMemberId.set(id);
    if (!id) {
      this.selectedMember.set(null);
      this.summary.set(null);
      this.error.set(null);
      return;
    }
    const member = this.members().find((m) => m.id === id) ?? null;
    if (member) {
      this.selectedMember.set(member);
      this.loadMemberSummary(member.id);
    }
  }

  clearMember(): void {
    this.selectedMemberId.set('');
    this.selectedMember.set(null);
    this.summary.set(null);
    this.error.set(null);
  }

  // ──────────────────────────────────────────────────────────────
  // CHARGEMENT DU RÉSUMÉ
  // ──────────────────────────────────────────────────────────────

  private loadMemberSummary(memberId: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.offeringsService.getMemberSummary(memberId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.summary.set(response.data);
        } else {
          this.summary.set(null);
          this.error.set(response.message || 'Impossible de charger le résumé.');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur chargement résumé:', err);
        this.summary.set(null);
        this.error.set('Erreur lors du chargement du résumé.');
        this.isLoading.set(false);
      },
    });
  }

  // ──────────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────────

  viewOffering(offering: any): void {
    if (offering && offering.id) {
      this.router.navigate(['/dashboard/offrandes', offering.id]);
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard/offrandes']);
  }

  // ──────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────

  getMemberFullName(member: Member): string {
    return `${member.firstName} ${member.lastName}`.trim();
  }

  getMemberInitials(member: Member): string {
    const f = member.firstName?.charAt(0) || '?';
    const l = member.lastName?.charAt(0) || '?';
    return `${f}${l}`.toUpperCase();
  }

  getOfferingTypeColor(type: string): string {
    return this.getTypeColorClass(type);
  }

  getFormattedDateFromString(dateStr: string): string {
    return this.getFormattedDate(dateStr);
  }
}
