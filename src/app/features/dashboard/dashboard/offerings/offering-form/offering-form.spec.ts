import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfferingForm } from './offering-form';

describe('OfferingForm', () => {
  let component: OfferingForm;
  let fixture: ComponentFixture<OfferingForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfferingForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfferingForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
