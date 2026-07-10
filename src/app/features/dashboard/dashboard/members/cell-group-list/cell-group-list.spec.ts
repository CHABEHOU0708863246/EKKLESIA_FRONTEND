import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CellGroupList } from './cell-group-list';

describe('CellGroupList', () => {
  let component: CellGroupList;
  let fixture: ComponentFixture<CellGroupList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CellGroupList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CellGroupList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
