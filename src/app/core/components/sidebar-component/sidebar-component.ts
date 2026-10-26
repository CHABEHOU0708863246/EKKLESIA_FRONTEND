import { Component, HostListener, OnDestroy, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
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

  /** Classe posée sur <body> pour bloquer le défilement quand le menu est ouvert. */
  private static readonly BODY_LOCK_CLASS = 'iam-sidebar-open';

  private readonly isBrowser: boolean;

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
    public permission: Permissions,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadCurrentUser();

    if (!this.isBrowser) return;

    // Fermeture systématique à la navigation, y compris pour une navigation
    // programmée (redirection, retour navigateur) qui n'appelle aucun lien.
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.closeMobileSidebar();
        }
      });

    this.syncBodyScrollLock();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.isBrowser && this.document.body.classList.remove(SidebarComponent.BODY_LOCK_CLASS);
  }

  private loadCurrentUser(): void {
    this.authService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
        },
        error: () => {
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
    this.syncBodyScrollLock();
  }

  closeMobileSidebar(): void {
    this.isMobileOpen = false;
    // Toujours resynchroniser : garantit qu'aucun verrou de défilement
    // ne survit à une fermeture (navigation, Échap, clic sur le fond).
    this.syncBodyScrollLock();
  }

  /** Réduit/étend la sidebar en mode desktop (icônes seules) */
  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  /**
   * Point d'entrée unique pour le bouton "hamburger" du Topbar.
   * Sur mobile : ouvre/ferme le panneau off-canvas.
   * Sur desktop : bascule le mode réduit (icônes seules).
   */
  onMenuToggleClick(): void {
    if (this.isMobileViewport()) {
      this.toggleMobileSidebar();
    } else {
      this.toggleSidebar();
    }
  }

  /**
   * Détection fiable du mode mobile : le layout off-canvas est actif < 901px.
   * On privilégie `window.innerWidth` (synchrone, fiable en PWA/WebView), avec
   * `matchMedia` en repli pour les environnements qui l'exposent seuls.
   */
  private isMobileViewport(): boolean {
    if (!this.isBrowser) return false;

    if (typeof window.innerWidth === 'number') {
      return window.innerWidth < SidebarComponent.DESKTOP_BREAKPOINT;
    }

    return window.matchMedia
      ? window.matchMedia(`(max-width: ${SidebarComponent.DESKTOP_BREAKPOINT - 1}px)`).matches
      : true;
  }

  /** Bloque le défilement de la page quand le tiroir mobile est ouvert. */
  private syncBodyScrollLock(): void {
    if (!this.isBrowser) return;

    const shouldLock = this.isMobileOpen && this.isMobileViewport();
    this.document.body.classList.toggle(SidebarComponent.BODY_LOCK_CLASS, shouldLock);
  }

  /** Échap ferme le tiroir mobile. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobileSidebar();
  }

  /** Évite une sidebar « ouverte » fantôme après rotation ou agrandissement. */
  @HostListener('window:resize')
  onResize(): void {
    if (!this.isMobileViewport() && this.isMobileOpen) {
      this.closeMobileSidebar();
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
    this.tokenService.logout();
    this.permission.clearPermissions();

    this.authService
      .logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.router.navigate(['/auth/login']),
        error: () => this.router.navigate(['/auth/login'])
      });
  }
}
