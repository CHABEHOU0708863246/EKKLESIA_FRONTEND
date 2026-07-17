import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CellGroupEdit } from './cell-group-edit';

describe('CellGroupEdit', () => {
  let component: CellGroupEdit;
  let fixture: ComponentFixture<CellGroupEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CellGroupEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CellGroupEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
