import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastoralActDetail } from './pastoral-act-detail';

describe('PastoralActDetail', () => {
  let component: PastoralActDetail;
  let fixture: ComponentFixture<PastoralActDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PastoralActDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PastoralActDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
