import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfferingList } from './offering-list';

describe('OfferingList', () => {
  let component: OfferingList;
  let fixture: ComponentFixture<OfferingList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfferingList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfferingList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
