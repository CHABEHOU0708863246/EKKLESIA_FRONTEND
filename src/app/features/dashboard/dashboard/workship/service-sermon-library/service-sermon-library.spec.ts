import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceSermonLibrary } from './service-sermon-library';

describe('ServiceSermonLibrary', () => {
  let component: ServiceSermonLibrary;
  let fixture: ComponentFixture<ServiceSermonLibrary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceSermonLibrary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceSermonLibrary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
