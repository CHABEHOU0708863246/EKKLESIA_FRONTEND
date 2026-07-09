import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastoralActs } from './pastoral-acts';

describe('PastoralActs', () => {
  let component: PastoralActs;
  let fixture: ComponentFixture<PastoralActs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PastoralActs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PastoralActs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
