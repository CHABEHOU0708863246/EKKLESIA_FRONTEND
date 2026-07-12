import { Church as ChurchService } from '../../../../../core/services/Church/church';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ConfirmDialog } from '../../../../../core/components/confirm-dialog/confirm-dialog';
import { ChurchFilter, DEFAULT_CHURCH_FILTER, ChurchUtils, Church } from '../../../../../core/models/Church/church.model';
import { Site, SiteUtils } from '../../../../../core/models/Church/site.model';



const PAGE_SIZE_OPTIONS = [10, 20, 50];

@Component({
  selector: 'app-church-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ConfirmDialog],
  templateUrl: './church-list.html',
  styleUrl: './church-list.scss',
})
export class ChurchList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  searchControl = new FormControl('');
  statusControl = new FormControl('');
  typeControl = new FormControl('');
  existingSites = signal<Site[]>([]);

  churches = signal<Church[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  currentPage = signal(1);
  pageSize = signal(20);
  totalCount = signal(0);

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  isEmpty = computed(() => !this.loading() && this.churches().length === 0);

  // ── Lignes dépliées (affichage des sites) ──
  expandedChurchIds = signal<Set<string>>(new Set());

  // ── Sites en cours de chargement par église (lazy load au dépliage) ──
  loadingSitesFor = signal<Set<string>>(new Set());
  sitesByChurch = signal<Record<string, Site[]>>({});

  // ── Suppression ──
  deleteDialogVisible = signal(false);
  churchToDelete = signal<Church | null>(null);
  deleting = signal(false);

  // ── Toggle statut ──
  togglingChurchId = signal<string | null>(null);

  private filter: ChurchFilter = { ...DEFAULT_CHURCH_FILTER };

  constructor(
    private churchService: ChurchService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loadChurches();

    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadChurches();
      });

    this.statusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadChurches();
      });

    this.typeControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadChurches();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ───────────────────────────────────────────────────────────────

  loadChurches(): void {
    this.loading.set(true);
    this.error.set(null);

    this.filter = {
      ...DEFAULT_CHURCH_FILTER,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      name: this.searchControl.value || undefined,
      isActive: this.statusControl.value === '' ? undefined : this.statusControl.value === 'true',
      isHeadquarters: this.typeControl.value === '' ? undefined : this.typeControl.value === 'true',
    };

    this.churchService
      .getChurches(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; data: { items: any; totalCount: any; }; message: any; }) => {
          if (response.success && response.data) {
            this.churches.set(response.data.items ?? []);
            this.totalCount.set(response.data.totalCount ?? 0);
          } else {
            this.churches.set([]);
            this.totalCount.set(0);
            this.error.set(response.message || 'Impossible de charger les églises.');
          }
          this.loading.set(false);
        },
        error: (err: any) => {
          console.error('❌ Erreur lors du chargement des églises:', err);
          this.churches.set([]);
          this.loading.set(false);
          this.error.set('Impossible de charger la liste des églises.');
        },
      });
  }

  refresh(): void {
    this.loadChurches();
  }

  resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.typeControl.setValue('', { emitEvent: false });
    this.currentPage.set(1);
    this.loadChurches();
  }

  // ───────────────────────────────────────────────────────────────
  // PAGINATION
  // ───────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadChurches();
  }

  previousPage(): void { this.goToPage(this.currentPage() - 1); }
  nextPage(): void { this.goToPage(this.currentPage() + 1); }

  onPageSizeChange(size: string): void {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
    this.loadChurches();
  }

  get pageRangeLabel(): string {
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.totalCount());
    return this.totalCount() === 0 ? '0 résultat' : `${start}–${end} sur ${this.totalCount()}`;
  }

  // ───────────────────────────────────────────────────────────────
  // AFFICHAGE DES SITES (accordéon avec chargement à la demande)
  // ───────────────────────────────────────────────────────────────

  toggleChurchExpanded(church: Church, event: Event): void {
    event.stopPropagation();
    const current = new Set(this.expandedChurchIds());

    if (current.has(church.id)) {
      current.delete(church.id);
      this.expandedChurchIds.set(current);
      return;
    }

    current.add(church.id);
    this.expandedChurchIds.set(current);

    // Si les sites de cette église n'ont pas encore été chargés
    // (l'église liste peut ne renvoyer que siteCount sans le détail),
    // on les charge à la demande.
    if (!this.sitesByChurch()[church.id]) {
      this.loadSitesForChurch(church);
    }
  }

  private loadSitesForChurch(church: Church): void {
    // Si l'objet Church renvoyé par getChurches() contient déjà
    // le tableau "sites" complet, on l'utilise directement — pas
    // besoin d'un appel réseau supplémentaire.
    if (church.sites && church.sites.length > 0) {
      this.sitesByChurch.update((map) => ({ ...map, [church.id]: church.sites }));
      return;
    }

    const loadingSet = new Set(this.loadingSitesFor());
    loadingSet.add(church.id);
    this.loadingSitesFor.set(loadingSet);

    this.churchService
      .getSitesByChurchId(church.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; data: any; }) => {
          const loadingSetAfter = new Set(this.loadingSitesFor());
          loadingSetAfter.delete(church.id);
          this.loadingSitesFor.set(loadingSetAfter);

          if (response.success && response.data) {
            this.sitesByChurch.update((map) => ({ ...map, [church.id]: response.data }));
          } else {
            this.sitesByChurch.update((map) => ({ ...map, [church.id]: [] }));
          }
        },
        error: () => {
          const loadingSetAfter = new Set(this.loadingSitesFor());
          loadingSetAfter.delete(church.id);
          this.loadingSitesFor.set(loadingSetAfter);
          this.sitesByChurch.update((map) => ({ ...map, [church.id]: [] }));
        },
      });
  }

  isChurchExpanded(churchId: string): boolean {
    return this.expandedChurchIds().has(churchId);
  }

  isSitesLoading(churchId: string): boolean {
    return this.loadingSitesFor().has(churchId);
  }

  getSites(churchId: string): Site[] {
    return this.sitesByChurch()[churchId] ?? [];
  }

  // ───────────────────────────────────────────────────────────────
  // ACTIONS ÉGLISE
  // ───────────────────────────────────────────────────────────────

  createChurch(): void {
    this.router.navigate(['/dashboard/admin/parametres/eglise/new']);
  }

  viewChurch(church: Church): void {
    this.router.navigate(['/dashboard/admin/parametres/eglise', church.id]);
  }

  editChurch(church: Church, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/admin/parametres/eglise', church.id, 'edit']);
  }

  toggleStatus(church: Church, event: Event): void {
    event.stopPropagation();
    this.togglingChurchId.set(church.id);

    this.churchService
      .toggleChurchStatus(church.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; message: any; }) => {
          this.togglingChurchId.set(null);
          if (response.success) {
            this.churches.update((list) =>
              list.map((c) => (c.id === church.id ? { ...c, isActive: !c.isActive } : c))
            );
          } else {
            this.error.set(response.message || 'Impossible de modifier le statut.');
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur lors du changement de statut:', err);
          this.togglingChurchId.set(null);
          this.error.set('Impossible de modifier le statut de cette église.');
        },
      });
  }

  requestDelete(church: Church, event: Event): void {
    event.stopPropagation();
    this.churchToDelete.set(church);
    this.deleteDialogVisible.set(true);
  }

  cancelDelete(): void {
    this.deleteDialogVisible.set(false);
    this.churchToDelete.set(null);
  }

  confirmDelete(): void {
    const church = this.churchToDelete();
    if (!church) return;

    this.deleting.set(true);
    this.churchService
      .deleteChurch(church.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; message: any; }) => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.churchToDelete.set(null);
          if (response.success) {
            this.loadChurches();
          } else {
            this.error.set(response.message || 'Impossible de supprimer cette église.');
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur lors de la suppression:', err);
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.churchToDelete.set(null);
          this.error.set('Impossible de supprimer cette église.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // ACTIONS SITE
  // ───────────────────────────────────────────────────────────────

  addSite(church: Church, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/admin/parametres/eglise', church.id, 'sites', 'new']);
  }

  editSite(church: Church, site: Site, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/admin/parametres/eglise', church.id, 'sites', site.id, 'edit']);
  }

  toggleSiteStatus(church: Church, site: Site, event: Event): void {
    event.stopPropagation();
    this.churchService
      .toggleSiteStatus(church.id, site.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; message: any; }) => {
          if (response.success) {
            this.sitesByChurch.update((map) => {
              const list = (map[church.id] ?? []).map((s) =>
                s.id === site.id ? { ...s, isActive: !s.isActive } : s
              );
              return { ...map, [church.id]: list };
            });
          } else {
            this.error.set(response.message || 'Impossible de modifier le statut du site.');
          }
        },
        error: (err: any) => {
          console.error('❌ Erreur lors du changement de statut du site:', err);
          this.error.set('Impossible de modifier le statut du site.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getInitials(name: string): string {
    return ChurchUtils.getInitials(name);
  }

  getSiteInitials(name: string): string {
    return SiteUtils.getInitials(name);
  }

  getStatusBadge(isActive: boolean) {
    return ChurchUtils.getStatusBadge(isActive);
  }

  getHeadquartersBadge(isHeadquarters: boolean) {
    return ChurchUtils.getHeadquartersBadge(isHeadquarters);
  }

  getShortAddress(church: Church): string {
    return ChurchUtils.getShortAddress(church);
  }

  getSiteCountLabel(church: Church): string {
    return ChurchUtils.getSiteCountLabel(church);
  }

  getSiteAddress(site: Site): string {
    return SiteUtils.getFormattedAddress(site);
  }

  getSiteServices(site: Site): string {
    return SiteUtils.getFormattedServices(site.serviceTimes);
  }

  getSiteStatusBadge(isActive: boolean) {
    return SiteUtils.getStatusBadge(isActive);
  }
}
