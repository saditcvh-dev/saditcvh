import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionBadge } from './action-badge';

describe('ActionBadge', () => {
  let component: ActionBadge;
  let fixture: ComponentFixture<ActionBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionBadge]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
