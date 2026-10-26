import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { SidebarComponent } from './sidebar-component';
import { Auth } from '../../services/Auth/auth';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let originalWidth: number;

  beforeEach(async () => {
    originalWidth = window.innerWidth;
    // jsdom est large par défaut : on simule un téléphone.
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 375,
    });

    await TestBed.configureTestingModule({
      imports: [SidebarComponent]
    }).compileComponents();

    // Évite un appel HTTP de profil pendant le test.
    const auth = TestBed.inject(Auth);
    vi.spyOn(auth, 'getCurrentUser').mockReturnValue(of(null as any));

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    document.body.classList.remove('iam-sidebar-open');
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalWidth,
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ouvre et ferme 20 fois de suite sans se désynchroniser', () => {
    for (let i = 0; i < 20; i++) {
      const expected = i % 2 === 0;
      component.onMenuToggleClick();
      expect(component.isMobileOpen).toBe(expected);
      expect(document.body.classList.contains('iam-sidebar-open')).toBe(expected);
    }
  });

  it('ferme le tiroir avec la touche Échap', () => {
    component.onMenuToggleClick();
    expect(component.isMobileOpen).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(component.isMobileOpen).toBe(false);
    expect(document.body.classList.contains('iam-sidebar-open')).toBe(false);
  });

  it('ferme le tiroir à la navigation', async () => {
    component.onMenuToggleClick();
    expect(component.isMobileOpen).toBe(true);

    await TestBed.inject(Router).navigateByUrl('/une-page');

    expect(component.isMobileOpen).toBe(false);
    expect(document.body.classList.contains('iam-sidebar-open')).toBe(false);
  });

  it('ne pose pas le verrou de défilement en mode desktop', () => {
    window.innerWidth = 1280;

    component.onMenuToggleClick();

    expect(component.isCollapsed).toBe(true);
    expect(component.isMobileOpen).toBe(false);
    expect(document.body.classList.contains('iam-sidebar-open')).toBe(false);
  });
});
