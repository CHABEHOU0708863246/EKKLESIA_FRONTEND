import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentWidget } from './agent-widget';

describe('AgentWidget', () => {
  let component: AgentWidget;
  let fixture: ComponentFixture<AgentWidget>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentWidget]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgentWidget);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the idle state label by default', () => {
    expect(component.stateLabel).toBe('En ligne');
  });
});
