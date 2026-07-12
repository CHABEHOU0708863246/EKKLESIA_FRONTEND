import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChurchForm } from './church-form';

describe('ChurchForm', () => {
  let component: ChurchForm;
  let fixture: ComponentFixture<ChurchForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChurchForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChurchForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
