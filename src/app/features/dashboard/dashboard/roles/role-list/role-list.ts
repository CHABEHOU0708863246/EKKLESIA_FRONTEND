// src/app/features/dashboard/dashboard/admin/roles/role-list/role-list.ts
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ConfirmDialog } from '../../../../../core/components/confirm-dialog/confirm-dialog';
import { PERMISSIONS_BY_MODULE, RoleResponseDto, RoleFilterDto, DEFAULT_ROLE_FILTER, RoleDtoUtils } from '../../../../../core/models/Roles/role.models';
import { Roles } from '../../../../../core/services/Roles/roles';
import { getPermissionLabel, getPermissionLabelWithCode } from '../../../../../core/models/Roles/permission-labels';


const PAGE_SIZE_OPTIONS = [10, 20, 50];

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ConfirmDialog],
  templateUrl: './role-list.html',
  styleUrl: './role-list.scss',
})
export class RoleList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  // ── Map inverse : permission -> nom du module, pour regrouper l'affichage ──
  private readonly permissionToModule = new Map<string, string>(
    Object.entries(PERMISSIONS_BY_MODULE).flatMap(([module, perms]) =>
      perms.map((p) => [p, module] as [string, string])
    )
  );

  searchControl = new FormControl('');
  statusControl = new FormControl('');

  roles = signal<RoleResponseDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  currentPage = signal(1);
  pageSize = signal(20);
  totalCount = signal(0);

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  isEmpty = computed(() => !this.loading() && this.roles().length === 0);

  // ── Lignes dépliées (affichage des permissions) ──
  expandedRoleIds = signal<Set<string>>(new Set());

  // ── Suppression ──
  deleteDialogVisible = signal(false);
  roleToDelete = signal<RoleResponseDto | null>(null);
  deleting = signal(false);

  private filter: RoleFilterDto = { ...DEFAULT_ROLE_FILTER };

  constructor(
    private roleService: Roles,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loadRoles();

    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadRoles();
      });

    this.statusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadRoles();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getPermissionLabel(permission: string): string {
    return getPermissionLabel(permission);
  }

  getPermissionLabelWithCode(permission: string): string {
    return getPermissionLabelWithCode(permission);
  }



  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ───────────────────────────────────────────────────────────────

  loadRoles(): void {
    this.loading.set(true);
    this.error.set(null);

    this.filter = {
      ...DEFAULT_ROLE_FILTER,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      isVisible: this.statusControl.value === '' ? undefined : this.statusControl.value === 'true',
    };

    this.roleService
      .getRoles(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; message: any; data: any; }) => {
          if (response.success && response.data) {
            let items = response.data.items ?? [];

            // Filtrage texte côté client (le backend ne prend pas de "search" générique ici)
            const term = this.searchControl.value?.trim();
            if (term) {
              items = RoleDtoUtils.filterBySearch(items, term);
            }

            this.roles.set(items);
            this.totalCount.set(response.data.totalCount ?? items.length);
          } else {
            this.roles.set([]);
            this.totalCount.set(0);
            this.error.set(response.message || 'Impossible de charger les rôles.');
          }
          this.loading.set(false);
        },
        error: (err: { message: any; }) => {
          this.roles.set([]);
          this.loading.set(false);
          this.error.set('Impossible de charger la liste des rôles.');
        },
      });
  }

  refresh(): void {
    this.loadRoles();
  }

  resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.currentPage.set(1);
    this.loadRoles();
  }

  // ───────────────────────────────────────────────────────────────
  // PAGINATION
  // ───────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadRoles();
  }

  previousPage(): void { this.goToPage(this.currentPage() - 1); }
  nextPage(): void { this.goToPage(this.currentPage() + 1); }

  onPageSizeChange(size: string): void {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
    this.loadRoles();
  }

  get pageRangeLabel(): string {
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.totalCount());
    return this.totalCount() === 0 ? '0 résultat' : `${start}–${end} sur ${this.totalCount()}`;
  }

  // ───────────────────────────────────────────────────────────────
  // AFFICHAGE DES PERMISSIONS (accordéon)
  // ───────────────────────────────────────────────────────────────

  toggleRoleExpanded(roleId: string, event: Event): void {
    event.stopPropagation();
    const current = new Set(this.expandedRoleIds());
    if (current.has(roleId)) {
      current.delete(roleId);
    } else {
      current.add(roleId);
    }
    this.expandedRoleIds.set(current);
  }

  isRoleExpanded(roleId: string): boolean {
    return this.expandedRoleIds().has(roleId);
  }

/**
   * ✅ Grouper les permissions par module
   */
  getGroupedPermissions(role: RoleResponseDto): [string, string[]][] {
    // ✅ Typer explicitement le résultat
    const grouped: Record<string, string[]> = {};

    // ✅ Utiliser Object.entries avec des types explicites
    const entries = Object.entries(PERMISSIONS_BY_MODULE) as [string, string[]][];

    for (const [moduleName, modulePermissions] of entries) {
      // Filtrer les permissions du rôle qui appartiennent à ce module
      const matchingPermissions: string[] = role.permissions.filter(
        (permission: string) => modulePermissions.includes(permission)
      );

      if (matchingPermissions.length > 0) {
        // Trier les permissions par ordre alphabétique
        matchingPermissions.sort((a: string, b: string) => a.localeCompare(b));
        grouped[moduleName] = matchingPermissions;
      }
    }

    // Convertir en tableau et trier par nom de module
    const result = Object.entries(grouped) as [string, string[]][];
    return result.sort((a: [string, string[]], b: [string, string[]]) =>
      a[0].localeCompare(b[0])
    );
  }


  // ───────────────────────────────────────────────────────────────
  // ACTIONS
  // ───────────────────────────────────────────────────────────────

  createRole(): void {
    this.router.navigate(['/dashboard/admin/roles/new']);
  }

  editRole(role: RoleResponseDto, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/admin/roles', role.id, 'edit']);
  }

  cloneRole(role: RoleResponseDto, event: Event): void {
    event.stopPropagation();
    const newName = prompt('Nom du nouveau rôle cloné :', `${role.roleName} (copie)`);
    if (!newName || !newName.trim()) return;

    this.roleService
      .cloneRole(role.id, newName.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; message: any; }) => {
          if (response.success) {
            this.loadRoles();
          } else {
            this.error.set(response.message || 'Impossible de cloner ce rôle.');
          }
        },
        error: (err: { message: any; }  ) => {
          console.error('❌ Erreur lors du clonage:', err);
          this.error.set('Impossible de cloner ce rôle.');
        },
      });
  }

  requestDelete(role: RoleResponseDto, event: Event): void {
    event.stopPropagation();
    this.roleToDelete.set(role);
    this.deleteDialogVisible.set(true);
  }

  cancelDelete(): void {
    this.deleteDialogVisible.set(false);
    this.roleToDelete.set(null);
  }

  confirmDelete(): void {
    const role = this.roleToDelete();
    if (!role) return;

    this.deleting.set(true);
    this.roleService
      .deleteRole(role.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: any; message: any; }) => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.roleToDelete.set(null);
          if (response.success) {
            this.loadRoles();
          } else {
            this.error.set(response.message || 'Impossible de supprimer ce rôle.');
          }
        },
        error: (err: { message: any; }  ) => {
          console.error('❌ Erreur lors de la suppression:', err);
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.roleToDelete.set(null);
          this.error.set('Impossible de supprimer ce rôle.');
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getInitials(roleName: string): string {
    return RoleDtoUtils.getInitials(roleName);
  }

  getStatusLabel(role: RoleResponseDto): string {
    return RoleDtoUtils.getStatusLabel(role);
  }

  getStatusClass(role: RoleResponseDto): string {
    if (role.isSystem) return 'is-system';
    if (!role.isVisible) return 'is-hidden';
    return 'is-active';
  }

  isDeletable(role: RoleResponseDto): boolean {
    return RoleDtoUtils.isDeletable(role);
  }

  isEditable(role: RoleResponseDto): boolean {
    return RoleDtoUtils.isEditable(role);
  }
}
