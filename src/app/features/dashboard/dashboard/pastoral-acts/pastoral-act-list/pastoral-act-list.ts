// src/app/features/dashboard/dashboard/pastoral-acts/pastoral-act-list/pastoral-act-list.ts
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import {
  PastoralActType,
  PastoralActTypeLabels,
  PastoralActTypeIcons,
} from '../../../../../core/models/PastoralAct/pastoral-act.enums';
import { PastoralActUtils } from '../../../../../core/models/PastoralAct/pastoral-act.models';
import {
  PastoralActResponseDto,
  PastoralActFilterDto,
  DEFAULT_PASTORAL_ACT_FILTER,
} from '../../../../../core/models/PastoralAct/pastoral-act.dtos';
import { PastoralActs } from '../../../../../core/services/PastoralAct/pastoral-acts'; // adapte le chemin
import { ConfirmDialog } from '../../../../../core/components/confirm-dialog/confirm-dialog'; // adapte le chemin

import { Church as ChurchModel } from '../../../../../core/models/Church/church.model';
import { Church as ChurchService } from '../../../../../core/services/Church/church';

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Tous les types', icon: '📋' },
  ...Object.values(PastoralActType).map((value) => ({
    value,
    label: PastoralActTypeLabels[value],
    icon: PastoralActTypeIcons[value],
  })),
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

@Component({
  selector: 'app-pastoral-act-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ConfirmDialog],
  templateUrl: './pastoral-act-list.html',
  styleUrl: './pastoral-act-list.scss',
})
export class PastoralActList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly typeFilterOptions = TYPE_FILTER_OPTIONS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly PastoralActType = PastoralActType;

  // ── Filtres ──
  typeControl = new FormControl('');
  churchControl = new FormControl('');
  dateFromControl = new FormControl('');
  dateToControl = new FormControl('');
  certificateControl = new FormControl('');

  churches = signal<ChurchModel[]>([]);
  loadingChurches = signal(false);

  acts = signal<PastoralActResponseDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  currentPage = signal(1);
  pageSize = signal(20);
  totalCount = signal(0);

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  isEmpty = computed(() => !this.loading() && this.acts().length === 0);

  // ── Suppression ──
  deleteDialogVisible = signal(false);
  actToDelete = signal<PastoralActResponseDto | null>(null);
  deleting = signal(false);

  // ── Génération de certificat ──
  generatingCertificateId = signal<string | null>(null);

  private filter: PastoralActFilterDto = { ...DEFAULT_PASTORAL_ACT_FILTER };

  constructor(
    public pastoralActService: PastoralActs,
    private churchService: ChurchService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loadChurches();
    this.loadActs();

    this.typeControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage.set(1); this.loadActs(); });

    this.churchControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage.set(1); this.loadActs(); });

    this.dateFromControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage.set(1); this.loadActs(); });

    this.dateToControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage.set(1); this.loadActs(); });

    this.certificateControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage.set(1); this.loadActs(); });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // ÉGLISES (filtre)
  // ───────────────────────────────────────────────────────────────

  private loadChurches(): void {
    this.loadingChurches.set(true);
    this.churchService
      .getAllChurches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) this.churches.set(response.data as any);
          this.loadingChurches.set(false);
        },
        error: () => this.loadingChurches.set(false),
      });
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT DE LA LISTE
  // ───────────────────────────────────────────────────────────────

  loadActs(): void {
    this.loading.set(true);
    this.error.set(null);

    this.filter = {
      ...DEFAULT_PASTORAL_ACT_FILTER,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      type: (this.typeControl.value as PastoralActType) || undefined,
      churchId: this.churchControl.value || undefined,
      dateFrom: this.dateFromControl.value || undefined,
      dateTo: this.dateToControl.value || undefined,
      certificateGenerated:
        this.certificateControl.value === '' ? undefined : this.certificateControl.value === 'true',
    };

    this.pastoralActService
      .getAll(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.acts.set(response.items ?? []);
          this.totalCount.set(response.totalCount ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement des actes pastoraux:', err);
          this.acts.set([]);
          this.loading.set(false);
          this.error.set('Impossible de charger la liste des actes pastoraux.');
        },
      });
  }

  refresh(): void {
    this.loadActs();
  }

  resetFilters(): void {
    this.typeControl.setValue('', { emitEvent: false });
    this.churchControl.setValue('', { emitEvent: false });
    this.dateFromControl.setValue('', { emitEvent: false });
    this.dateToControl.setValue('', { emitEvent: false });
    this.certificateControl.setValue('', { emitEvent: false });
    this.currentPage.set(1);
    this.loadActs();
  }

  // ───────────────────────────────────────────────────────────────
  // PAGINATION
  // ───────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadActs();
  }

  previousPage(): void { this.goToPage(this.currentPage() - 1); }
  nextPage(): void { this.goToPage(this.currentPage() + 1); }

  onPageSizeChange(size: string): void {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
    this.loadActs();
  }

  get pageRangeLabel(): string {
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.totalCount());
    return this.totalCount() === 0 ? '0 résultat' : `${start}–${end} sur ${this.totalCount()}`;
  }

  // ───────────────────────────────────────────────────────────────
  // ACTIONS
  // ───────────────────────────────────────────────────────────────

  createAct(): void {
    this.router.navigate(['/dashboard/actes-pastoraux/new']);
  }

  viewAct(act: PastoralActResponseDto): void {
    this.router.navigate(['/dashboard/actes-pastoraux', act.id]);
  }

  editAct(act: PastoralActResponseDto, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/actes-pastoraux', act.id, 'edit']);
  }

  generateCertificate(act: PastoralActResponseDto, event: Event): void {
    event.stopPropagation();
    if (act.certificateGenerated) return;

    this.generatingCertificateId.set(act.id);

    this.pastoralActService
      .generateCertificate(act.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.generatingCertificateId.set(null);
          if (response.isSuccess) {
            this.acts.update((list) =>
              list.map((a) => (a.id === act.id ? response : a))
            );
          } else {
            this.error.set(response.errorMessage || 'Impossible de générer le certificat.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors de la génération du certificat:', err);
          this.generatingCertificateId.set(null);
          this.error.set('Impossible de générer le certificat.');
        },
      });
  }

  requestDelete(act: PastoralActResponseDto, event: Event): void {
    event.stopPropagation();
    this.actToDelete.set(act);
    this.deleteDialogVisible.set(true);
  }

  cancelDelete(): void {
    this.deleteDialogVisible.set(false);
    this.actToDelete.set(null);
  }

  confirmDelete(): void {
    const act = this.actToDelete();
    if (!act) return;

    this.deleting.set(true);
    this.pastoralActService
      .delete(act.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.actToDelete.set(null);
          this.loadActs();
        },
        error: (err) => {
          console.error('❌ Erreur lors de la suppression:', err);
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.actToDelete.set(null);
          this.error.set('Impossible de supprimer cet acte pastoral.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getTypeLabel(type: PastoralActType): string {
    return PastoralActUtils.getTypeLabel(type);
  }

  getTypeIcon(type: PastoralActType): string {
    return PastoralActUtils.getTypeIcon(type);
  }

  getTypeColor(type: PastoralActType): string {
    return PastoralActUtils.getTypeColor(type);
  }

  getMainParticipantName(act: PastoralActResponseDto): string {
    const mainRoles = ['Baptisé', 'Baptisé(e)', 'Époux', 'Épouse', 'Défunt', 'Enfant'];
    const main = act.participants.find((p) => mainRoles.includes(p.role));
    if (main) return `${main.firstName} ${main.lastName}`;
    if (act.participants.length > 0) return `${act.participants[0].firstName} ${act.participants[0].lastName}`;
    return '—';
  }

  getParticipantsCountLabel(act: PastoralActResponseDto): string {
    const count = act.participants?.length ?? 0;
    if (count <= 1) return '';
    return `+${count - 1} autre${count - 1 > 1 ? 's' : ''}`;
  }

  formatDate(date: Date | string): string {
    return PastoralActUtils.formatDate(date);
  }

  canGenerateCertificate(act: PastoralActResponseDto): boolean {
    return !act.certificateGenerated && act.type !== PastoralActType.Funeral;
  }
}
