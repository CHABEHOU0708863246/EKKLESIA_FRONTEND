import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CellGroupDetail } from './cell-group-detail';

describe('CellGroupDetail', () => {
  let component: CellGroupDetail;
  let fixture: ComponentFixture<CellGroupDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CellGroupDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CellGroupDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
