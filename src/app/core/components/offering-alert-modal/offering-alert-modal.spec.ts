import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { OfferingAlertModal } from './offering-alert-modal';
import { Service as WorshipService } from '../../services/Worship/service';
import { Permissions } from '../../services/Permissions/permissions';
import { OfferingAlert } from '../../models/Events/service.model';

describe('OfferingAlertModal', () => {
  let component: OfferingAlertModal;
  let fixture: ComponentFixture<OfferingAlertModal>;
  let worship: WorshipService;
  let permissions: Permissions;
  let router: Router;

  const items: OfferingAlert[] = [
    {
      id: 's1',
      title: 'Culte du dimanche',
      date: new Date().toISOString(),
      churchName: 'MIAV Centrale',
      siteName: 'Site A',
      daysSince: 3,
      canCreateOffering: true,
      canDeclareNoOffering: true,
    },
    {
      id: 's2',
      title: 'Réunion de prière',
      date: new Date().toISOString(),
      churchName: 'MIAV Centrale',
      daysSince: 5,
      canCreateOffering: true,
      canDeclareNoOffering: true,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfferingAlertModal],
    }).compileComponents();

    worship = TestBed.inject(WorshipService);
    permissions = TestBed.inject(Permissions);
    router = TestBed.inject(Router);

    vi.spyOn(permissions, 'hasAnyPermission').mockReturnValue(true);
    vi.spyOn(worship, 'getOfferingAlerts').mockReturnValue(
      of({ items, totalCount: items.length }) as any
    );

    fixture = TestBed.createComponent(OfferingAlertModal);
    component = fixture.componentInstance;
  });

  it('ouvre la fenêtre à la navigation avec les cultes en attente', () => {
    component.onNavigation('/dashboard');
    fixture.detectChanges();

    expect(component.isOpen()).toBe(true);
    expect(component.items().length).toBe(2);
  });

  it('ne s’affiche pas sur le formulaire d’offrande', () => {
    component.onNavigation('/dashboard/offrandes/new?serviceId=s1');
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
    expect(worship.getOfferingAlerts).not.toHaveBeenCalled();
  });

  it('« Plus tard » ferme la fenêtre', () => {
    component.onNavigation('/dashboard');
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);

    component.later();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
  });

  it('« Enregistrer maintenant » ouvre le formulaire avec le culte présélectionné', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.enregistrer(items[0]);

    expect(navigate).toHaveBeenCalledWith(
      ['/dashboard/offrandes/new'],
      { queryParams: { serviceId: 's1' } }
    );
    expect(component.isOpen()).toBe(false);
  });

  it('refuse une déclaration dont le motif est trop court', () => {
    const declare = vi.spyOn(worship, 'declareNoOffering');
    component.askDeclare(items[0]);
    component.reasonText = 'court';

    component.confirmDeclare(items[0]);

    expect(declare).not.toHaveBeenCalled();
    expect(component.error()).toContain('motif');
  });

  it('« Aucune offrande » avec motif valide retire le culte de la liste', () => {
    vi.spyOn(worship, 'declareNoOffering').mockReturnValue(of({ success: true }) as any);

    component.onNavigation('/dashboard');
    fixture.detectChanges();

    component.askDeclare(items[0]);
    component.reasonText = 'Réunion de prière sans collecte.';
    component.confirmDeclare(items[0]);
    fixture.detectChanges();

    expect(component.items().map((i) => i.id)).toEqual(['s2']);
  });
});
