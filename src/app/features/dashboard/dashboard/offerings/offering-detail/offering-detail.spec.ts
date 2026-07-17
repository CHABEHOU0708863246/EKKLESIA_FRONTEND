import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfferingDetail } from './offering-detail';

describe('OfferingDetail', () => {
  let component: OfferingDetail;
  let fixture: ComponentFixture<OfferingDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfferingDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfferingDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
