import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfferingReceipts } from './offering-receipts';

describe('OfferingReceipts', () => {
  let component: OfferingReceipts;
  let fixture: ComponentFixture<OfferingReceipts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfferingReceipts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfferingReceipts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
