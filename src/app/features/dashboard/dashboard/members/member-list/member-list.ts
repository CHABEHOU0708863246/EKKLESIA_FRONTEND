// src/app/features/dashboard/dashboard/members/member-list/member-list.ts
import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import {
  Member,
  MemberFilter,
  DEFAULT_MEMBER_FILTER,
} from '../../../../../core/models/Members/member.model';
import { CellGroup } from '../../../../../core/models/Members/cell-group.model';
import { Members } from '../../../../../core/services/Members/members';
import { ConfirmDialog } from "../../../../../core/components/confirm-dialog/confirm-dialog";

// ── Libellés français pour les enums backend (clé anglaise -> libellé) ──
const STATUS_LABELS: Record<string, string> = {
  Visitor: 'Visiteur',
  Adherent: 'Adhérent',
  Active: 'Actif',
  Inactive: 'Inactif',
  ExMember: 'Ancien membre',
};

const SPIRITUAL_STATUS_LABELS: Record<string, string> = {
  NonBeliever: 'Non converti',
  Catechumen: 'Catéchumène',
  Believer: 'Croyant',
  Baptized: 'Baptisé(e)',
  Disciple: 'Disciple',
  Leader: 'Leader',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'Visitor', label: 'Visiteur' },
  { value: 'Adherent', label: 'Adhérent' },
  { value: 'Active', label: 'Actif' },
  { value: 'Inactive', label: 'Inactif' },
  { value: 'ExMember', label: 'Ancien membre' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './member-list.html',
  styleUrl: './member-list.scss',
})
export class MemberList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  searchControl = new FormControl('');
  statusControl = new FormControl('');
  cellGroupControl = new FormControl('');

  members = signal<Member[]>([]);
  cellGroups = signal<CellGroup[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  currentPage = signal(1);
  pageSize = signal(25);
  totalCount = signal(0);

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  isEmpty = computed(() => !this.loading() && this.members().length === 0);

  private filter: MemberFilter = { ...DEFAULT_MEMBER_FILTER };

  constructor(
    private memberService: Members,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCellGroups();
    this.loadMembers();

    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.currentPage.set(1);
        this.loadMembers(term ?? '');
      });

    this.statusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadMembers();
      });

    this.cellGroupControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadMembers();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ───────────────────────────────────────────────────────────────

  private loadCellGroups(): void {
    this.memberService
      .getCellGroups(undefined, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (groups) => this.cellGroups.set(groups ?? []),
        error: () => this.cellGroups.set([]),
      });
  }

  loadMembers(fullName?: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.filter = {
      ...DEFAULT_MEMBER_FILTER,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      fullName: (fullName ?? this.searchControl.value ?? '') || undefined,
      status: this.statusControl.value || "" as any,
      cellGroupId: this.cellGroupControl.value || undefined,
    };

    this.memberService
      .getMembers(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const items = (res as any)?.items ?? (res as any) ?? [];
          this.members.set(items);
          this.totalCount.set((res as any)?.totalCount ?? items.length);
          this.loading.set(false);
        },
        error: (err) => {
          this.members.set([]);
          this.loading.set(false);
          this.error.set("Impossible de charger la liste des membres. Veuillez réessayer.");
        },
      });
  }

  refresh(): void {
    this.loadMembers();
  }

  // ───────────────────────────────────────────────────────────────
  // PAGINATION
  // ───────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadMembers();
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  onPageSizeChange(size: string): void {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
    this.loadMembers();
  }

  // ───────────────────────────────────────────────────────────────
  // ACTIONS
  // ───────────────────────────────────────────────────────────────

  viewMember(member: Member): void {
    this.router.navigate(['/dashboard/membres', (member as any).id]);
  }

  editMember(member: Member, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/membres', (member as any).id, 'edit']);
  }

  deleteMember(member: Member, event: Event): void {
    event.stopPropagation();
    const name = (member as any).fullName ?? `${(member as any).firstName} ${(member as any).lastName}`;
    if (!confirm(`Supprimer ${name} ? Cette action est réversible (suppression douce).`)) return;

    this.memberService
      .deleteMember((member as any).id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadMembers(),
        error: (err) => {
          console.error('❌ Erreur lors de la suppression:', err);
          this.error.set('Impossible de supprimer ce membre.');
        },
      });
  }

  resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.cellGroupControl.setValue('', { emitEvent: false });
    this.currentPage.set(1);
    this.loadMembers('');
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getInitials(member: Member): string {
    const f = (member as any).firstName ?? '?';
    const l = (member as any).lastName ?? '?';
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  }

  getFullName(member: Member): string {
    return (member as any).fullName ?? `${(member as any).firstName} ${(member as any).lastName}`;
  }

  getStatusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      Visitor: 'is-visitor',
      Adherent: 'is-adherent',
      Active: 'is-active',
      Inactive: 'is-inactive',
      ExMember: 'is-exmember',
    };
    return map[status] ?? '';
  }

  getSpiritualStatusLabel(status: string): string {
    return SPIRITUAL_STATUS_LABELS[status] ?? status;
  }

  getCellGroupName(id: string | undefined | null): string {
    if (!id) return '—';
    return this.cellGroups().find((c) => (c as any).id === id)?.name ?? '—';
  }

  get pageRangeLabel(): string {
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.totalCount());
    return this.totalCount() === 0 ? '0 résultat' : `${start}–${end} sur ${this.totalCount()}`;
  }
}
