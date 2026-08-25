// zone-list.ts
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ZoneResponse, ZoneFilter } from '../../../../../core/models/Zones/zone.model';
import { DEFAULT_ZONE_FILTER, ZoneUtils } from '../../../../../core/models/Zones/zone.utils';
import { ZoneService } from '../../../../../core/services/Zones/zone-service';
import { ConfirmDialog } from "../../../../../core/components/confirm-dialog/confirm-dialog";

@Component({
  selector: 'app-zone-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, ConfirmDialog],
  templateUrl: './zone-list.html',
  styleUrl: './zone-list.scss',
})
export class ZoneList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  zones = signal<ZoneResponse[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  currentPage = signal(1);
  totalPages = signal(1);
  totalCount = signal(0);
  pageSize = signal(20);
  pageSizeOptions = [10, 20, 50];

  searchControl = new FormControl('');
  statusControl = new FormControl('');

  deleteDialogVisible = signal(false);
  zoneToDelete = signal<ZoneResponse | null>(null);

  isEmpty = computed(() => !this.loading() && (this.zones()?.length ?? 0) === 0);

  get pageRangeLabel(): string {
    if (this.totalCount() === 0) return 'Aucune zone';
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.totalCount());
    return `${start}–${end} sur ${this.totalCount()} zones`;
  }

  constructor(private zoneService: ZoneService, private router: Router) {}

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage.set(1); this.loadZones(); });

    this.statusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage.set(1); this.loadZones(); });

    this.loadZones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

loadZones(): void {
  this.loading.set(true);
  this.error.set(null);

  this.zoneService.getAllZones().subscribe((res) => {
    this.loading.set(false);
    if (!res.success) {
      this.error.set(res.message);
      this.zones.set([]);
      return;
    }
    // res.data est un tableau de zones
    const zones = res.data ?? [];
    this.zones.set(zones);
    this.totalCount.set(zones.length);
    this.totalPages.set(1); // pas de pagination, une seule page
    // Si besoin, on peut désactiver la pagination
  });
}

  resetFilters(): void {
    this.searchControl.setValue('');
    this.statusControl.setValue('');
  }

  refresh(): void {
    this.loadZones();
  }

  createZone(): void {
    this.router.navigate(['/dashboard/admin/zones/new']);
  }

  editZone(zone: ZoneResponse, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/admin/zones', zone.id, 'edit']);
  }

  viewZone(zone: ZoneResponse): void {
    this.router.navigate(['/dashboard/admin/zones', zone.id, 'edit']);
  }

  requestDelete(zone: ZoneResponse, event: Event): void {
    event.stopPropagation();
    this.zoneToDelete.set(zone);
    this.deleteDialogVisible.set(true);
  }

  cancelDelete(): void {
    this.deleteDialogVisible.set(false);
    this.zoneToDelete.set(null);
  }

  confirmDelete(): void {
    const zone = this.zoneToDelete();
    if (!zone) return;

    this.zoneService.deleteZone(zone.id).subscribe((res) => {
      this.deleteDialogVisible.set(false);
      this.zoneToDelete.set(null);
      if (res.success) this.loadZones();
      else this.error.set(res.message);
    });
  }

  previousPage(): void {
    if (this.currentPage() > 1) { this.currentPage.update((p) => p - 1); this.loadZones(); }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) { this.currentPage.update((p) => p + 1); this.loadZones(); }
  }

  onPageSizeChange(value: string): void {
    this.pageSize.set(Number(value));
    this.currentPage.set(1);
    this.loadZones();
  }

  getInitials(name: string): string {
    return ZoneUtils.getInitials(name);
  }

  getStatusBadge(isActive: boolean) {
    return ZoneUtils.getStatusBadge(isActive);
  }

  getSiteCountLabel(zone: ZoneResponse): string {
    return ZoneUtils.getSiteCountLabel(zone.siteCount ?? zone.siteIds.length);
  }
}
