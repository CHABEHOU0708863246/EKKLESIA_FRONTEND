import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Token } from '../../services/Token/token';
import { Permissions } from '../../../core/services/Permissions/permissions';
import { User } from '../../models/Users/user.model';
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/Auth/auth';

@Component({
  selector: 'app-sidebar-component',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar-component.html',
  styleUrl: './sidebar-component.scss',
})
export class SidebarComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  /** Point de rupture mobile / desktop, aligné sur le SCSS (@media min-width: 901px) */
  private static readonly DESKTOP_BREAKPOINT = 901;

  isCollapsed: boolean = false;
  /** Sidebar visible en mode mobile (off-canvas) */
  isMobileOpen: boolean = false;

  currentUser: User | null = null;

  suiviPastoralCount: number = 0;
  planningAlertsCount: number = 0;
  depensesEnAttenteCount: number = 0;

  constructor(
    private authService: Auth,
    private tokenService: Token,
    private router: Router,
    public permission: Permissions  // ✅ Utiliser PermissionsService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    console.log('✅ Sidebar chargée - Permissions:', this.permission.getUserPermissions());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.authService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          console.log('✅ Utilisateur chargé dans sidebar:', user?.fullName);
        },
        error: (error) => {
          console.warn('⚠️ Impossible de charger l\'utilisateur courant:', error);
          this.currentUser = null;
        }
      });
  }

  /**
   * Bascule l'état d'ouverture d'un menu, en comportement accordéon :
   * ouvrir un sous-menu referme automatiquement les autres du même niveau.
   */
  toggleMenu(event: MouseEvent): void {
    event.preventDefault();
    const link = event.currentTarget as HTMLElement;
    const item = link.parentElement;
    if (!item) return;

    const wasOpen = item.classList.contains('open');

    // Referme les autres items ouverts au même niveau (siblings)
    const siblings = Array.from(item.parentElement?.children ?? []);
    siblings.forEach(sibling => {
      if (sibling !== item) {
        sibling.classList.remove('open');
      }
    });

    // Bascule l'item cliqué
    item.classList.toggle('open', !wasOpen);
  }

  /** Ouvre/ferme la sidebar en mode mobile (off-canvas) */
  toggleMobileSidebar(): void {
    this.isMobileOpen = !this.isMobileOpen;
  }

  closeMobileSidebar(): void {
    this.isMobileOpen = false;
  }

  /** Réduit/étend la sidebar en mode desktop (icônes seules) */
  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  /**
   * Point d'entrée unique pour le bouton "hamburger" du Topbar.
   * Sur mobile : ouvre/ferme le panneau off-canvas.
   * Sur desktop : bascule le mode réduit (icônes seules).
   * C'est cette méthode que le Dashboard doit appeler (via ViewChild),
   * au lieu de manipuler le DOM directement.
   */
  onMenuToggleClick(): void {
    const isMobile = typeof window !== 'undefined'
      && window.innerWidth < SidebarComponent.DESKTOP_BREAKPOINT;

    if (isMobile) {
      this.toggleMobileSidebar();
    } else {
      this.toggleSidebar();
    }
  }

  getUserInitials(): string {
    if (!this.currentUser?.fullName) return '??';
    return this.currentUser.fullName
      .trim()
      .split(/\s+/)
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  logout(): void {
    console.log('🚪 Déconnexion en cours...');
    this.tokenService.logout();

    this.authService
      .logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.router.navigate(['/auth/login']),
        error: (error) => {
          console.warn('⚠️ Erreur API déconnexion (ignorée):', error);
          this.router.navigate(['/auth/login']);
        }
      });
  }
}
