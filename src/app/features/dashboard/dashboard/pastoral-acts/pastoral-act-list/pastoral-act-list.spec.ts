import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastoralActList } from './pastoral-act-list';

describe('PastoralActList', () => {
  let component: PastoralActList;
  let fixture: ComponentFixture<PastoralActList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PastoralActList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PastoralActList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
