import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitorPipeline } from './visitor-pipeline';

describe('VisitorPipeline', () => {
  let component: VisitorPipeline;
  let fixture: ComponentFixture<VisitorPipeline>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitorPipeline]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisitorPipeline);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
