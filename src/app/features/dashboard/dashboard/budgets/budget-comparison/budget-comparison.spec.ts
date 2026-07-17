import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BudgetComparison } from './budget-comparison';

describe('BudgetComparison', () => {
  let component: BudgetComparison;
  let fixture: ComponentFixture<BudgetComparison>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetComparison]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BudgetComparison);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
