import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChurchList } from './church-list';

describe('ChurchList', () => {
  let component: ChurchList;
  let fixture: ComponentFixture<ChurchList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChurchList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChurchList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
