import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastoralCare } from './pastoral-care';

describe('PastoralCare', () => {
  let component: PastoralCare;
  let fixture: ComponentFixture<PastoralCare>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PastoralCare]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PastoralCare);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
