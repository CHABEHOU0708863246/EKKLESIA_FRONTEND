import { Component, OnDestroy, OnInit, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ConfirmDialog } from '../../../../../core/components/confirm-dialog/confirm-dialog';
import { User, UserFilter, DEFAULT_USER_FILTER, UserUtils } from '../../../../../core/models/Users/user.model';
import { Users } from '../../../../../core/services/Users/users';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';


const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Tous les rôles' },
  { value: 'SUPER_ADMIN', label: 'Super Administrateur' },
  { value: 'PASTOR_PRINCIPAL', label: 'Pasteur Principal' },
  { value: 'PASTEUR_SITE', label: 'Pasteur de Site' },
  { value: 'ELDER', label: 'Ancien / Diacre' },
  { value: 'TREASURER', label: 'Trésorier de Site' },
  { value: 'PASTORAL_SECRETARY', label: 'Secrétaire Pastoral' },
  { value: 'CELL_LEADER', label: 'Responsable de Cellule' },
  { value: 'DEPARTMENT_HEAD', label: 'Responsable de Département' },
  { value: 'HR_MANAGER', label: 'Responsable RH' },
  { value: 'COMMUNICATION', label: 'Responsable Communication' },
  { value: 'PROPERTY_MANAGER', label: 'Responsable Patrimoine' },
  { value: 'MEMBER', label: 'Membre Ordinaire' },
  { value: 'VOLUNTEER', label: 'Bénévole' },
];

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'Super Admin',
  Admin: 'Administrateur',
  Pastor: 'Pasteur',
  CellLeader: 'Chef de cellule',
  Treasurer: 'Trésorier',
  Member: 'Membre',
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  photoUrls = new Map<string, SafeUrl | string>();

  readonly roleFilterOptions = ROLE_FILTER_OPTIONS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  searchControl = new FormControl('');
  roleControl = new FormControl('');
  statusControl = new FormControl('');

  users = signal<User[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  currentPage = signal(1);
  pageSize = signal(25);
  totalCount = signal(0);

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  isEmpty = computed(() => !this.loading() && this.users().length === 0);

  // ── Suppression ──
  deleteDialogVisible = signal(false);
  userToDelete = signal<User | null>(null);
  deleting = signal(false);

  // ── Activation/désactivation ──
  togglingUserId = signal<string | null>(null);

  private filter: UserFilter = { ...DEFAULT_USER_FILTER };

  constructor(
    private userService: Users,
    private router: Router,
    private sanitizer: DomSanitizer,
  ) { }

  ngOnInit(): void {
    this.loadUsers();

    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadUsers();
      });

    this.roleControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadUsers();
      });

    this.statusControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadUsers();
      });
  }

  ngOnDestroy(): void {
    this.photoUrls.forEach((url) => {
      if (typeof url === 'string' && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ───────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ───────────────────────────────────────────────────────────────

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.filter = {
      ...DEFAULT_USER_FILTER,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      fullName: this.searchControl.value || undefined,
      roles: this.roleControl.value ? [this.roleControl.value] : undefined,
      isActive: this.statusControl.value === '' ? undefined : this.statusControl.value === 'true',
    };

    this.userService
      .getUsers(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // ✅ CORRECTION : Vérifier la présence des données
          if (response.data && response.data.items) {
            this.users.set(response.data.items);
            this.totalCount.set(response.data.totalCount ?? 0);

            // ✅ Réinitialiser l'erreur si des données sont présentes
            this.error.set(null);
          } else {
            this.users.set([]);
            this.totalCount.set(0);
            this.error.set('Aucun utilisateur trouvé.');
          }
          this.loading.set(false);
        },
        error: (err) => {
          this.users.set([]);
          this.loading.set(false);
          this.error.set('Impossible de charger la liste des utilisateurs.');
        },
      });
  }

  refresh(): void {
    this.loadUsers();
  }

  resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.roleControl.setValue('', { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.currentPage.set(1);
    this.loadUsers();
  }

  // ───────────────────────────────────────────────────────────────
  // PAGINATION
  // ───────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadUsers();
  }

  previousPage(): void { this.goToPage(this.currentPage() - 1); }
  nextPage(): void { this.goToPage(this.currentPage() + 1); }

  onPageSizeChange(size: string): void {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
    this.loadUsers();
  }

  get pageRangeLabel(): string {
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.totalCount());
    return this.totalCount() === 0 ? '0 résultat' : `${start}–${end} sur ${this.totalCount()}`;
  }

  // ───────────────────────────────────────────────────────────────
  // ACTIONS
  // ───────────────────────────────────────────────────────────────

  viewUser(user: User): void {
    this.router.navigate(['/dashboard/admin/utilisateurs', user.id]);
  }

  editUser(user: User, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/admin/utilisateurs', user.id, 'edit']);
  }

  manageRoles(user: User, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/admin/utilisateurs', user.id, 'roles']);
  }

  toggleStatus(user: User, event: Event): void {
    event.stopPropagation();
    this.togglingUserId.set(user.id);

    this.userService
      .toggleUserStatus(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.togglingUserId.set(null);
          if (response.success) {
            this.users.update((list) =>
              list.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
            );
          } else {
            this.error.set(response.message || 'Impossible de modifier le statut.');
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors du changement de statut:', err);
          this.togglingUserId.set(null);
          this.error.set('Impossible de modifier le statut de cet utilisateur.');
        },
      });
  }

  requestDelete(user: User, event: Event): void {
    event.stopPropagation();
    this.userToDelete.set(user);
    this.deleteDialogVisible.set(true);
  }

  cancelDelete(): void {
    this.deleteDialogVisible.set(false);
    this.userToDelete.set(null);
  }

  // ───────────────────────────────────────────────────────────────
  // EXPORT
  // ───────────────────────────────────────────────────────────────

  exportUsers(format: 'csv' | 'xlsx'): void {
    this.userService
      .exportUsers(format)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `utilisateurs_export.${format}`;
            link.click();
            window.URL.revokeObjectURL(url);
          } else {
            this.error.set("Impossible de générer l'export.");
          }
        },
        error: (err) => {
          console.error("❌ Erreur lors de l'export:", err);
          this.error.set("Impossible de générer l'export.");
        },
      });
  }

  // ───────────────────────────────────────────────────────────────
  // HELPERS D'AFFICHAGE
  // ───────────────────────────────────────────────────────────────

  getInitials(user: User): string {
    return UserUtils.getInitials(user);
  }

  getFullName(user: User): string {
    return UserUtils.getFullName(user);
  }

  getStatusLabel(isActive: boolean): string {
    return UserUtils.getStatusLabel(isActive);
  }

  getStatusColor(isActive: boolean): string {
    return UserUtils.getStatusColor(isActive);
  }

  getRoleLabel(role: string): string {
    return ROLE_LABELS[role] ?? role;
  }

  getFormattedLastLogin(date?: string): string {
    if (!date) return 'Jamais connecté';
    return UserUtils.getFormattedDate(date);
  }

  /**
 * ✅ Récupérer l'URL de la photo pour l'affichage (synchrone)
 */
getUserPhotoUrl(user: User): string {
  // Si pas de photo valide, utiliser l'avatar par défaut
  if (!user.photoUrl || user.photoUrl === 'default-profile-photo') {
    return this.getDefaultAvatar(user);
  }

  // Si l'URL est déjà construite dans le cache
  if (this.photoUrls.has(user.id)) {
    const cached = this.photoUrls.get(user.id);
    return typeof cached === 'string' ? cached : this.getDefaultAvatar(user);
  }

  // Construire l'URL
  const url = this.userService.getPhotoUrl(user.photoUrl);

  // Si l'URL est valide, la stocker et la retourner
  if (url) {
    this.photoUrls.set(user.id, url);
    return url;
  }

  // Sinon, retourner l'avatar par défaut
  return this.getDefaultAvatar(user);
}

  /**
   * ✅ Générer un avatar par défaut avec les initiales (en Data URL)
   */
  getDefaultAvatar(user: User): string {
    const initials = this.getInitials(user);
    const colors = ['#4A90D9', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#3498DB'];
    const colorIndex = (user.id?.length || 0) % colors.length;
    const color = colors[colorIndex];

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="20" fill="${color}"/>
        <text x="20" y="24" text-anchor="middle" font-family="Arial, sans-serif"
              font-size="16" font-weight="bold" fill="white">
          ${initials}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  /**
   * ✅ Gestionnaire d'erreur de chargement d'image
   */
  onImageError(user: User): void {
    // Utiliser l'avatar par défaut en cas d'erreur
    this.photoUrls.set(user.id, this.getDefaultAvatar(user));
  }

}
