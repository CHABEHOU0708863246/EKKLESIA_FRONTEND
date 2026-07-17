// src/app/features/dashboard/finances/offerings/offering-by-member/offering-by-member.component.ts

import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Members } from '../../../../../core/services/Members/members';
import { Member } from '../../../../../core/models/Members/member.model';
import { Offering, OfferingSummaryDto, OfferingUtils } from '../../../../../core/models/Finances/offering.model';
import { OfferingTypeLabels, OfferingTypeIcons, OfferingTypeColors } from '../../../../../core/models/Finances/offering.model';
import { Offerings } from '../../../../../core/services/Finances/offerings';
import { Users } from '../../../../../core/services/Users/users';

@Component({
  selector: 'app-offering-by-member',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
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
  isSearching = signal(false);
  error = signal<string | null>(null);

  // ── Recherche de membre ──
  searchControl = new FormControl('');
  showSearchResults = signal(false);
  searchResults = signal<Member[]>([]);

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
  private userService = inject(Users);

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
    // Recherche de membre avec debounce
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term: string | null) => {
        const value = term ?? ''; // ou term || ''
        if (value.trim().length >= 2) {
          this.searchMembers(value.trim());
        } else {
          this.searchResults.set([]);
          this.showSearchResults.set(false);
        }
      });
  }

  getMemberPhotoUrl(member: Member): string {
  return this.userService.getPhotoUrl(member.photoUrl);
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
  // RECHERCHE DE MEMBRE
  // ──────────────────────────────────────────────────────────────

  private searchMembers(term: string): void {
    this.isSearching.set(true);
    this.showSearchResults.set(true);

    this.memberService
      .getMembers({ page: 1, pageSize: 10, fullName: term } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const items = response?.items || [];
          this.searchResults.set(items);
          this.isSearching.set(false);
        },
        error: () => {
          this.searchResults.set([]);
          this.isSearching.set(false);
        },
      });
  }

  selectMember(member: Member): void {
    this.selectedMember.set(member);
    this.searchControl.setValue(`${member.firstName} ${member.lastName}`, { emitEvent: false });
    this.showSearchResults.set(false);
    this.searchResults.set([]);
    this.loadMemberSummary(member.id);
  }

  clearMember(): void {
    this.selectedMember.set(null);
    this.searchControl.setValue('', { emitEvent: false });
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
