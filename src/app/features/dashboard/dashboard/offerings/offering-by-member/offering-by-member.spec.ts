import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfferingByMember } from './offering-by-member';

describe('OfferingByMember', () => {
  let component: OfferingByMember;
  let fixture: ComponentFixture<OfferingByMember>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfferingByMember]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfferingByMember);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
